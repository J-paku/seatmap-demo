import { forwardRef, useCallback, useImperativeHandle } from 'react'
import { EditSeatLayer } from './components/EditSeatLayer'
import { JumpMarker } from './components/JumpMarker'
import { TeamAreaLayer } from './components/TeamAreaLayer'
import { useCanvasPointer } from './hooks/use-canvas-pointer'
import { useCanvasViewModel } from './hooks/use-canvas-view-model'
import { useEditDrag } from './hooks/use-edit-drag'
import { useSeatJump } from './hooks/use-seat-jump'
import { useViewport } from './hooks/use-viewport'
import type { SeatMapCanvasHandle, SeatMapCanvasProps } from './type'
import { FacilityBlock } from '@/components/FacilityBlock'
import { SeatMirrorLayer } from '@/components/SeatMirrorLayer'
import { SEATMAP_BG_ID } from '@/components/SheetShell'
import { ZoomControls } from '@/components/ZoomControls'
import { AlignmentGuides } from '@/components/edit/AlignmentGuides'
import { SeatActionBar } from '@/components/edit/SeatActionBar'
import { UndoChip } from '@/components/edit/UndoChip'

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
    onSeatChangeTeamRequest,
    onSeatDeleteRequest,
    onUndo,
    canUndo,
  },
  ref
) {
  const viewport = useViewport()
  const { isPanningRef, handlers } = useCanvasPointer(viewport)
  const { pulsingSeatId, jumpToSeat } = useSeatJump(viewport)
  const edit = useEditDrag({ viewport, layout, isEditMode, onSeatMove, onTeamMove, onSeatEditSelect })
  const view = useCanvasViewModel({
    layout,
    viewport,
    isEditMode,
    pulsingSeatId,
    editSelectedSeatId: edit.editSelectedSeatId,
    onSeatSelect,
    onTeamBoundaryClick,
  })

  useImperativeHandle(ref, () => ({ jumpToSeat }), [jumpToSeat])

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
            facility={f}
            counterScale={view.counterScale}
            onSelect={(facilityId) => onFacilitySelect?.(facilityId)}
            state={facilityStateById?.get(f.id)}
            lod={view.lod}
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
        {view.pulsingSeat && <JumpMarker key={view.pulsingSeat.id} seat={view.pulsingSeat} />}
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
        onZoomIn={() => viewport.zoomButton(1)}
        onZoomOut={() => viewport.zoomButton(-1)}
        onReset={viewport.resetView}
      />
      {isEditMode && view.seatActionBarPos && edit.editSelectedSeatId && (
        <SeatActionBar
          x={view.seatActionBarPos.x}
          y={view.seatActionBarPos.y}
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
