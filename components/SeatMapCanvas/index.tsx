import { forwardRef, useCallback, useImperativeHandle, useMemo } from 'react'
import { EditSeatLayer } from './components/EditSeatLayer'
import { JumpMarker } from './components/JumpMarker'
import { TeamAreaLayer } from './components/TeamAreaLayer'
import { useCanvasPointer } from './hooks/use-canvas-pointer'
import { useEditDrag } from './hooks/use-edit-drag'
import { useSeatJump } from './hooks/use-seat-jump'
import { useViewport } from './hooks/use-viewport'
import { lodOf } from './utils/canvas-metrics'
import type { SeatMapCanvasHandle, SeatMapCanvasProps } from './type'
import { FacilityBlock } from '@/components/FacilityBlock'
import { SeatMirrorLayer } from '@/components/SeatMirrorLayer'
import { SEATMAP_BG_ID } from '@/components/SheetShell'
import { ZoomControls } from '@/components/ZoomControls'
import { AlignmentGuides } from '@/components/edit/AlignmentGuides'
import { SeatActionBar } from '@/components/edit/SeatActionBar'
import { UndoChip } from '@/components/edit/UndoChip'
import { clamp } from '@/utils/geometry'
import { resolveTeamColor } from '@/utils/team-colors'
import { useTeamColorMap } from '@/hooks/use-team-color-map'

// 02/11: 座席マップのキャンバス。パンズーム・チームアイランド・施設・編集ドラッグを束ねる。
// 11: チーム箱は team.area(サーバ座標)をそのまま描画する。座席からの逆算(旧 deriveTeamArea)は
// 箱同士の重なりを生む原因だったため廃止(編集モードの自動整列は lib/layout-actions.ts 側で完結)

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
    onSeatChangeTeamRequest,
    onSeatDeleteRequest,
    onUndo,
    canUndo,
  },
  ref
) {
  const teamColorMap = useTeamColorMap()
  const viewport = useViewport()
  const { isPanningRef, handlers } = useCanvasPointer(viewport)
  const { pulsingSeatId, jumpToSeat } = useSeatJump(viewport)
  const edit = useEditDrag({ viewport, layout, isEditMode, onSeatMove, onTeamMove, onSeatEditSelect })

  useImperativeHandle(ref, () => ({ jumpToSeat }), [jumpToSeat])

  const lod = lodOf(viewport.scaleSnap)
  const counterScale = useMemo(() => clamp(0.8 / viewport.scaleSnap, 1, 2), [viewport.scaleSnap])

  // 05: パルス中の座席(sr-only 化で個人カードが無いため、着地マーカーは座席の座標から直接描く)
  const pulsingSeat = useMemo(
    () => (pulsingSeatId ? layout.seats.find((s) => s.id === pulsingSeatId) ?? null : null),
    [pulsingSeatId, layout.seats]
  )

  // 11: チームラベルの N名 は「seat.id が team.idPrefix + '-' で始まり employeeId が非null」の件数
  const assignedCountByTeam = useMemo(() => {
    const map = new Map<string, number>()
    for (const team of layout.teams) {
      const prefix = `${team.idPrefix}-`
      map.set(team.id, layout.seats.filter((s) => s.id.startsWith(prefix) && s.employeeId !== null).length)
    }
    return map
  }, [layout.teams, layout.seats])

  // 07: 編集モード中は座席タップで詳細パネルを開かず、アクションバーの選択のみ行う
  const handleSeatSelect = useCallback(
    (seatId: string) => {
      if (isEditMode) return
      onSeatSelect?.(seatId)
    },
    [onSeatSelect, isEditMode]
  )

  // 10: チームバウンダリのタップ→画面座標 rect + チーム色を親へ渡してオーバーレイを開く
  const handleTeamBoundaryOpen = useCallback(
    (teamId: string, rect: DOMRect) => {
      const team = layout.teams.find((t) => t.id === teamId)
      if (!team) return
      const colorEntry = resolveTeamColor(teamColorMap, team.id, team.name)
      onTeamBoundaryClick?.({ teamId, teamName: team.name, teamColor: colorEntry.background, rect })
    },
    [layout.teams, teamColorMap, onTeamBoundaryClick]
  )

  // 07: 空き領域クリックで座席の編集選択を解除(各要素側は stopPropagation 済み)
  const handleCanvasBackgroundClick = useCallback(() => {
    if (isEditMode) edit.clearSelection()
  }, [isEditMode, edit])

  // 07: 選択中座席のフローティングアクションバー画面座標(座席右下近傍)
  const seatActionBarPos = useMemo(() => {
    if (!isEditMode || !edit.editSelectedSeatId) return null
    const seat = layout.seats.find((s) => s.id === edit.editSelectedSeatId)
    if (!seat) return null
    const t = viewport.transformRef.current
    return {
      x: (seat.x + seat.width) * t.scale + t.translateX + 8,
      y: (seat.y + seat.height / 2) * t.scale + t.translateY,
    }
    // scaleSnap をトリガーにして transformRef 更新後の再計算を促す(counterScale と同じ手法)
  }, [isEditMode, edit.editSelectedSeatId, layout.seats, viewport.transformRef, viewport.scaleSnap])

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
      onClick={handleCanvasBackgroundClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div ref={viewport.layerRef} className='seat-map-transform' data-canvas-transform-layer='true'>
        {/* z順: チームエリア → 施設/通路 → (編集モードのみ)座席。DOM順で座席をチーム箱より手前に置き、
            クリック/ドラッグを座席側へ優先させる */}
        <TeamAreaLayer
          teams={layout.teams}
          assignedCountByTeam={assignedCountByTeam}
          counterScale={counterScale}
          lod={lod}
          liveTeamPos={edit.liveTeamPos}
          isEditMode={isEditMode}
          onBoundaryOpen={handleTeamBoundaryOpen}
          onLabelEditPointerDown={edit.onTeamLabelEditPointerDown}
          onLabelTap={onTeamLabelTap}
        />
        {layout.facilities.map((f) => (
          <FacilityBlock
            key={f.id}
            facility={f}
            counterScale={counterScale}
            onSelect={(facilityId) => onFacilitySelect?.(facilityId)}
            state={facilityStateById?.get(f.id)}
            lod={lod}
            onHover={onFacilityHover}
          />
        ))}
        {isEditMode && (
          <EditSeatLayer
            seats={layout.seats}
            employeeById={employeeById}
            presenceMap={presenceMap}
            liveSeatPos={edit.liveSeatPos}
            editSelectedSeatId={edit.editSelectedSeatId}
            pulsingSeatId={pulsingSeatId}
            lod={lod}
            counterScale={counterScale}
            onSelect={handleSeatSelect}
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
        {pulsingSeat && <JumpMarker key={pulsingSeat.id} seat={pulsingSeat} />}
      </div>
      {/* 座席は個人カードとして描画しない。sr-only ミラー層のみがキーボード/スクリーンリーダー経路を提供する */}
      <SeatMirrorLayer
        seats={layout.seats}
        employeeById={employeeById}
        teams={layout.teams}
        onSelect={handleSeatSelect}
      />
      {/* 原本には常時表示の凡例パネルは無い(チーム名は各アイランドのラベル板で表示) */}
      <ZoomControls
        onZoomIn={() => viewport.zoomButton(1)}
        onZoomOut={() => viewport.zoomButton(-1)}
        onReset={viewport.resetView}
      />
      {isEditMode && seatActionBarPos && edit.editSelectedSeatId && (
        <SeatActionBar
          x={seatActionBarPos.x}
          y={seatActionBarPos.y}
          onChangeTeam={() => onSeatChangeTeamRequest?.(edit.editSelectedSeatId as string)}
          onDelete={() => onSeatDeleteRequest?.(edit.editSelectedSeatId as string)}
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
