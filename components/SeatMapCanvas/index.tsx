import { forwardRef, useCallback, useImperativeHandle } from 'react'
import { EditObjectLayer } from './components/EditObjectLayer'
import { EditSeatLayer } from './components/EditSeatLayer'
import { TeamAreaLayer } from './components/TeamAreaLayer'
import { useCanvasPointer } from './hooks/use-canvas-pointer'
import { useCanvasViewModel } from './hooks/use-canvas-view-model'
import { useEditDrag } from './hooks/use-edit-drag'
import { useViewport } from './hooks/use-viewport'
import { useZoomControls } from './hooks/use-zoom-controls'
import type { LivePosition, SeatMapCanvasHandle, SeatMapCanvasProps } from './type'
import type { LayoutObjectRef } from '@/types'
import { FacilityBlock } from '@/components/FacilityBlock'
import { FurnitureBlock } from '@/components/FurnitureBlock'
import { SeatMirrorLayer } from '@/components/SeatMirrorLayer'
import { SEATMAP_BG_ID } from '@/components/SheetShell'
import { ZoomControls } from '@/components/ZoomControls'
import { AlignmentGuides } from '@/components/edit/AlignmentGuides'
import { ObjectActionBar } from '@/components/edit/ObjectActionBar'
import { SeatActionBar } from '@/components/edit/SeatActionBar'
import { UndoChip } from '@/components/edit/UndoChip'

// ドラッグ中の対象だけ live 座標へ差し替える。実体を動かすことで座席と同じ手触りにする
const livePosOf = <T extends { id: string; x: number; y: number }>(item: T, live: LivePosition | null): T =>
  live && live.id === item.id ? { ...item, x: live.x, y: live.y } : item

// 02/11: 座席マップのキャンバス。パンズーム・チームアイランド・施設・編集ドラッグを束ねる。
// 11: チーム箱は team.area(サーバ座標)をそのまま描画する。座席からの逆算(旧 deriveTeamArea)は
// 箱同士の重なりを生む原因だったため廃止(編集モードの自動整列は utils/layout-actions 側で完結)

export type { SeatMapCanvasHandle } from './type'

type Props = SeatMapCanvasProps

export const SeatMapCanvas = forwardRef<SeatMapCanvasHandle, Props>(function SeatMapCanvas(
  {
    layout,
    employeeById,
    presenceMap,
    onSeatSelect,
    onFacilitySelect,
    onTeamBoundaryClick,
    facilityStateById,
    onFacilityHover,
    isEditMode = false,
    onSeatMove,
    onTeamMove,
    onSeatEditSelect,
    onTeamLabelTap,
    onSeatAssignRequest,
    onSeatChangeTeamRequest,
    onSeatDeleteRequest,
    onObjectMove,
    onObjectRepositionRequest,
    onObjectDeleteRequest,
    repositioningRef = null,
    onUndo,
    canUndo,
    onGoToMySeat,
  },
  ref
) {
  const viewport = useViewport()
  const zoom = useZoomControls(viewport)
  const { isPanningRef, handlers } = useCanvasPointer(viewport)
  const edit = useEditDrag({ viewport, layout, isEditMode, onSeatMove, onTeamMove, onSeatEditSelect, onObjectMove, onEmptySeatTap: onSeatAssignRequest })
  const view = useCanvasViewModel({
    layout,
    viewport,
    isEditMode,
    editSelectedSeatId: edit.editSelectedSeatId,
    editSelectedObject: edit.editSelectedObject,
    onSeatSelect,
    onTeamBoundaryClick,
  })

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
    () => ({ measureTeamRect, showUndoChipAt: edit.showUndoChipAt, centerOnSelector }),
    [measureTeamRect, edit.showUndoChipAt, centerOnSelector]
  )

  // 07: 空き領域クリックで座席の編集選択を解除(各要素側は stopPropagation 済み)
  const handleBackgroundClick = useCallback(() => {
    if (isEditMode) edit.clearSelection()
  }, [isEditMode, edit])

  return (
    <div
      ref={viewport.containerRef}
      id={SEATMAP_BG_ID}
      className={`seat-map-canvas${isPanningRef.current ? ' is-panning' : ''}`}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onPointerCancel={handlers.onPointerUp}
      onClickCapture={handlers.onClickCapture}
      onClick={handleBackgroundClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div ref={viewport.layerRef} className='seat-map-transform' data-canvas-transform-layer='true'>
        {/* z順: チームエリア → 施設/通路 → (編集モードのみ)座席。DOM順で座席をチーム箱より手前に置き、
            クリック/ドラッグを座席側へ優先させる */}
        <TeamAreaLayer
          teams={layout.teams}
          assignedCountByTeam={view.assignedCountByTeam}
          counterScale={view.counterScale}
          lod={view.lod}
          liveTeamPos={edit.liveTeamPos}
          isEditMode={isEditMode}
          onBoundaryOpen={view.handleTeamBoundaryOpen}
          onLabelEditPointerDown={edit.onTeamLabelEditPointerDown}
          onLabelTap={onTeamLabelTap}
        />
        {layout.facilities.map((f) => (
          <FacilityBlock
            key={f.id}
            facility={livePosOf(f, edit.liveObjectPos)}
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
            furniture={livePosOf(f, edit.liveObjectPos)}
            counterScale={view.counterScale}
          />
        ))}
        {isEditMode && (
          <EditObjectLayer
            facilities={layout.facilities}
            furniture={layout.furniture}
            selected={edit.editSelectedObject}
            repositioning={repositioningRef}
            livePos={edit.liveObjectPos}
            onEditPointerDown={edit.onObjectEditPointerDown}
          />
        )}
        {isEditMode && (
          <EditSeatLayer
            seats={layout.seats}
            employeeById={employeeById}
            presenceMap={presenceMap}
            liveSeatPos={edit.liveSeatPos}
            editSelectedSeatId={edit.editSelectedSeatId}
            lod={view.lod}
            counterScale={view.counterScale}
            onSelect={view.handleSeatSelect}
            onEditPointerDown={edit.onSeatEditPointerDown}
          />
        )}
        {isEditMode && edit.snapGuides.length > 0 && (
          <AlignmentGuides
            guides={edit.snapGuides}
            viewBoxW={layout.viewBox.width}
            viewBoxH={layout.viewBox.height}
          />
        )}
      </div>
      {/* 座席は個人カードとして描画しない。sr-only ミラー層のみがキーボード/スクリーンリーダー経路を提供する */}
      <SeatMirrorLayer
        seats={layout.seats}
        employeeById={employeeById}
        teams={layout.teams}
        onSelect={view.handleSeatSelect}
      />
      {/* 原本には常時表示の凡例パネルは無い(チーム名は各アイランドのラベル板で表示) */}
      <ZoomControls
        onZoomIn={zoom.zoomIn}
        onZoomOut={zoom.zoomOut}
        onReset={zoom.reset}
        onGoToMySeat={onGoToMySeat}
      />
      {isEditMode && view.seatActionBarPos && edit.editSelectedSeatId && (
        <SeatActionBar
          x={view.seatActionBarPos.x}
          y={view.seatActionBarPos.y}
          onAssign={() => onSeatAssignRequest?.(edit.editSelectedSeatId as string)}
          onChangeTeam={() => onSeatChangeTeamRequest?.(edit.editSelectedSeatId as string)}
          onDelete={() => onSeatDeleteRequest?.(edit.editSelectedSeatId as string)}
        />
      )}
      {isEditMode && view.objectActionBarPos && edit.editSelectedObject && (
        <ObjectActionBar
          x={view.objectActionBarPos.x}
          y={view.objectActionBarPos.y}
          onReposition={() => onObjectRepositionRequest?.(edit.editSelectedObject as LayoutObjectRef)}
          onDelete={() => onObjectDeleteRequest?.(edit.editSelectedObject as LayoutObjectRef)}
        />
      )}
      {isEditMode && edit.undoChipPos && canUndo && (
        <UndoChip
          x={edit.undoChipPos.x}
          y={edit.undoChipPos.y}
          onUndo={() => {
            onUndo?.()
            edit.dismissUndoChip()
          }}
        />
      )}
    </div>
  )
})
