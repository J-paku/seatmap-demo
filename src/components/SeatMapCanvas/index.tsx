import { forwardRef, memo, useCallback, useImperativeHandle, useMemo } from 'react'
import { EditObjectLayer } from './components/EditObjectLayer'
import { OffscreenTeamIndicator } from './components/OffscreenTeamIndicator'
import { TeamAreaLayer } from './components/TeamAreaLayer'
import { useCanvasPointer } from './hooks/use-canvas-pointer'
import { useCanvasViewModel } from './hooks/use-canvas-view-model'
import { useEditDrag } from './hooks/use-edit-drag'
import { useOffscreenTeamIndicator } from './hooks/use-offscreen-team-indicator'
import { useViewport } from './hooks/use-viewport'
import { useZoomControls } from './hooks/use-zoom-controls'
import type { SeatMapCanvasHandle, SeatMapCanvasProps } from './type'
import { FacilityBlock } from '@/components/FacilityBlock'
import { FurnitureBlock } from '@/components/FurnitureBlock'
import { SeatMirrorLayer } from '@/components/SeatMirrorLayer'
import { SEATMAP_BG_ID } from '@/components/SheetShell'
import { ZoomControls } from '@/components/ZoomControls'
import { ObjectActionBar } from '@/components/edit/ObjectActionBar'
import { SeatActionBar } from '@/components/edit/SeatActionBar'
import { UndoChip } from '@/components/edit/UndoChip'
import { useTeamColorMap } from '@/hooks/use-team-color-map'
import { useGlobalAnnouncement } from '@/contexts/announcement-context'
import { isOccupiedSeat } from '@/utils/seat-occupancy'
import { resolveTeamColor } from '@/utils/team-colors'
import styles from '@/components/seatmap.module.css'

// 02/11: 座席マップのキャンバス。パンズーム・チームアイランド・施設・編集ドラッグを束ねる。
// 11: チーム箱は team.area(サーバ座標)をそのまま描画する。座席からの逆算(旧 deriveTeamArea)は
// 箱同士の重なりを生む原因だったため廃止(編集モードの自動整列は utils/layout/layout-actions 側で完結)

export type { SeatMapCanvasHandle } from './type'

export const SeatMapCanvas = memo(forwardRef<SeatMapCanvasHandle, SeatMapCanvasProps>(function SeatMapCanvas(
  {
    layout,
    employeeById,
    onSeatSelect,
    onFacilitySelect,
    onTeamBoundaryClick,
    facilityStateById,
    onFacilityHover,
    isEditMode = false,
    onSeatEditSelect,
    onSeatSelectionChange,
    onTeamTap,
    onSeatAssignRequest,
    onSeatDeleteRequest,
    onObjectRepositionRequest,
    onObjectDeleteRequest,
    onObjectLockToggle,
    onObjectLabelToggle,
    repositioningRef = null,
    onUndo,
    canUndo,
    onGoToMySeat,
    onSeatRotateRequest,
    onSeatShapeRequest,
    onSeatBulkDeleteRequest,
    onEndSession,
    onEnterEditSession,
  },
  ref
) {
  const viewport = useViewport()
  const zoom = useZoomControls(viewport)
  const { isPanningRef, handlers } = useCanvasPointer(viewport)
  // 05-3: 家具・会議室のタップは「掴み直し」と同じ行き先(移動ゴースト)なので同じ口へ渡す
  const edit = useEditDrag({
    viewport,
    layout,
    isEditMode,
    onSeatEditSelect,
    onSeatSelectionChange,
    onTeamTap,
    onObjectTap: onObjectRepositionRequest,
    onEndSession,
  })
  const view = useCanvasViewModel({
    layout,
    employeeById,
    viewport,
    isEditMode,
    editSelectedObject: edit.editSelectedObject,
    onSeatSelect,
    onTeamBoundaryClick,
  })

  // 11: 全チームが画面外へ出た時だけ端に出る「最近傍チームへ移動」タグ。
  // 更新はジェスチャー終了時の transformSnap に同期する(毎フレーム再レンダーはしない)
  const teamColorMap = useTeamColorMap()
  const { announce } = useGlobalAnnouncement()
  const offscreen = useOffscreenTeamIndicator(
    viewport.containerRef,
    viewport.transformSnap,
    layout.teams,
    layout.seats,
    layout.facilities,
    viewport.animateTo,
    announce
  )

  // 検索ヒット経由でオーバーレイを開く際の拡大原点。チーム箱は画面外でも常に描画されているため
  // キャンバスを動かさずに実測できる(data-team-id の値は Team.idPrefix)
  const measureTeamRect = useCallback(
    (idPrefix: string): DOMRect | null => {
      const el = viewport.containerRef.current?.querySelector(`[data-team-id="${idPrefix}"]`)
      return el ? el.getBoundingClientRect() : null
    },
    [viewport.containerRef]
  )

  // コーチマークの対象を画面中央へ寄せる。倍率は変えず平行移動だけで合わせる
  const centerOnSelector = useCallback(
    (selector: string) => {
      const container = viewport.containerRef.current
      const el = container?.querySelector(selector)
      if (!container || !el) return
      const canvas = container.getBoundingClientRect()
      const target = el.getBoundingClientRect()
      const dx = canvas.left + canvas.width / 2 - (target.left + target.width / 2)
      const dy = canvas.top + canvas.height / 2 - (target.top + target.height / 2)
      const t = viewport.transformRef.current
      viewport.animateTo({ scale: t.scale, translateX: t.translateX + dx, translateY: t.translateY + dy })
    },
    [viewport]
  )

  useImperativeHandle(
    ref,
    () => ({ measureTeamRect, showUndoChipAt: edit.undoChip.showAt, centerOnSelector }),
    [measureTeamRect, edit.undoChip.showAt, centerOnSelector]
  )

  // 07: 空き領域クリックで座席の編集選択を解除(各要素側は stopPropagation 済み)
  const handleBackgroundClick = useCallback(() => {
    if (isEditMode) edit.clearSelection()
  }, [isEditMode, edit])

  // 05-3: 編集セッション中の座席選択はミラーボタンが唯一の入口。閲覧モードは従来どおり詳細を開く
  const handleMirrorSelect = useCallback(
    (seatId: string, toggle: boolean) => {
      if (isEditMode) edit.selectSeat(seatId, toggle)
      else view.handleSeatSelect(seatId)
    },
    [isEditMode, edit, view]
  )

  // 05-4: 単独選択のときだけ「配属/変更」が分かれる。着席判定は seat-occupancy に一本化する
  const isSelectedSeatOccupied = useMemo(() => {
    if (edit.editSelectedSeatIds.length !== 1) return false
    const seat = layout.seats.find((s) => s.id === edit.editSelectedSeatIds[0])
    return seat ? isOccupiedSeat(seat, employeeById) : false
  }, [edit.editSelectedSeatIds, layout.seats, employeeById])

  // 05-3: 属性バーの材料。ローカル const へ写すのはコールバックの中でも絞り込みを効かせるため
  // (view.x / edit.x のままだと呼び出しごとに null 判定が要る)
  const selectedObject = edit.editSelectedObject
  const objectAttrs = view.selectedObjectAttrs

  // 1席は既存の確認ダイアログへ、2席以上は件数ごと一括削除確認へ渡す(文言は仕様 07-2・別担当)
  const handleSeatDelete = useCallback(() => {
    const ids = edit.editSelectedSeatIds
    if (ids.length === 0) return
    if (ids.length === 1) onSeatDeleteRequest?.(ids[0])
    else onSeatBulkDeleteRequest?.(ids)
  }, [edit.editSelectedSeatIds, onSeatDeleteRequest, onSeatBulkDeleteRequest])

  return (
    <div
      ref={viewport.containerRef}
      id={SEATMAP_BG_ID}
      className={`${styles.seatMapCanvas}${isPanningRef.current ? ` ${styles.isPanning}` : ''}`}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onPointerCancel={handlers.onPointerUp}
      onClickCapture={handlers.onClickCapture}
      onClick={handleBackgroundClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div ref={viewport.layerRef} className={styles.seatMapTransform} data-canvas-transform-layer='true'>
        {/* z順: チームエリア → 施設/通路 → 設備の編集操作面。編集セッション中も座席は描かない
            (キャンバス = 通路線 + チーム箱 + 家具/会議室。CLAUDE.md 不変ルール1・仕様 00-2) */}
        <TeamAreaLayer
          teams={layout.teams}
          assignedCountByTeam={view.assignedCountByTeam}
          lod={view.lod}
          isEditMode={isEditMode}
          onBoundaryOpen={view.handleTeamBoundaryOpen}
          onLabelEditPointerDown={edit.onTeamLabelEditPointerDown}
          onEditTap={edit.onTeamEditTap}
          onLongPressEditSession={isEditMode ? undefined : onEnterEditSession}
        />
        {layout.facilities.map((f) => (
          <FacilityBlock
            key={f.id}
            facility={f}
            counterScale={view.counterScale}
            onSelect={(facilityId) => {
              // 編集モードでは詳細パネルを開かない。選択は上の EditObjectLayer が受ける
              if (!isEditMode) onFacilitySelect?.(facilityId)
            }}
            state={facilityStateById?.get(f.id)}
            lod={view.lod}
            onHover={isEditMode ? undefined : onFacilityHover}
          />
        ))}
        {layout.furniture.map((f) => (
          <FurnitureBlock
            key={f.id}
            furniture={f}
            counterScale={view.counterScale}
            onLongPressEditSession={isEditMode ? undefined : onEnterEditSession}
          />
        ))}
        {isEditMode && (
          <EditObjectLayer
            facilities={layout.facilities}
            furniture={layout.furniture}
            selected={edit.editSelectedObject}
            repositioning={repositioningRef}
            recent={canUndo ? edit.undoChip.recent : null}
            onEditPointerDown={edit.onObjectEditPointerDown}
            onEditTap={edit.onObjectEditTap}
          />
        )}
      </div>
      {/* 座席は個人カードとして描画しない。sr-only ミラー層のみがキーボード/スクリーンリーダー経路と、
          編集セッション中の座席選択入口を提供する */}
      <SeatMirrorLayer
        seats={layout.seats}
        employeeById={employeeById}
        teams={layout.teams}
        selectedSeatIds={isEditMode ? edit.editSelectedSeatIds : undefined}
        onSelect={handleMirrorSelect}
      />
      {/* 変換レイヤーの外(画面固定)。編集モードでは出さない — 編集オーバーレイと操作が衝突するため */}
      {!isEditMode && offscreen.nearestTeam && offscreen.pingPos && (
        <OffscreenTeamIndicator
          team={offscreen.nearestTeam}
          colorEntry={resolveTeamColor(teamColorMap, offscreen.nearestTeam.id, offscreen.nearestTeam.name)}
          pingPos={offscreen.pingPos}
          onGo={offscreen.goToNearestTeam}
        />
      )}
      {/* 原本には常時表示の凡例パネルは無い(チーム名は各アイランドのラベル板で表示) */}
      <ZoomControls
        onZoomIn={zoom.zoomIn}
        onZoomOut={zoom.zoomOut}
        onReset={zoom.reset}
        onGoToMySeat={onGoToMySeat}
      />
      {isEditMode && edit.editSelectedSeatIds.length > 0 && (
        <SeatActionBar
          seatIds={edit.editSelectedSeatIds}
          isSelectedSeatOccupied={isSelectedSeatOccupied}
          onAssign={() => onSeatAssignRequest?.(edit.editSelectedSeatIds[0])}
          onRotate={() => onSeatRotateRequest?.(edit.editSelectedSeatIds)}
          onEnlarge={() => onSeatShapeRequest?.(edit.editSelectedSeatIds)}
          onDelete={handleSeatDelete}
          onClearSelection={edit.clearSelection}
        />
      )}
      {/* 05-3: 移動ゴーストが出ている間は隠す。ゴースト層(z=overlay)の暗幕の下へ潜って
          触れなくなるため、出しっぱなしにすると「押せないボタン」になる */}
      {isEditMode && view.objectActionBarPos && objectAttrs && selectedObject && !repositioningRef && (
        <ObjectActionBar
          x={view.objectActionBarPos.x}
          y={view.objectActionBarPos.y}
          name={objectAttrs.name}
          locked={objectAttrs.locked}
          labelVisible={objectAttrs.labelVisible}
          canToggleLabel={objectAttrs.canToggleLabel}
          onToggleLock={() => onObjectLockToggle?.(selectedObject, !objectAttrs.locked)}
          onToggleLabel={() => onObjectLabelToggle?.(selectedObject, !objectAttrs.labelVisible)}
          onDelete={() => onObjectDeleteRequest?.(selectedObject)}
        />
      )}
      {isEditMode && edit.undoChip.view && canUndo && (
        <UndoChip
          x={edit.undoChip.view.chip.x}
          y={edit.undoChip.view.chip.y}
          message={edit.undoChip.message}
          frame={edit.undoChip.view.frame}
          onUndo={() => {
            onUndo?.()
            edit.undoChip.dismiss()
          }}
        />
      )}
    </div>
  )
}))
