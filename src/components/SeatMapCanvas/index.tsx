import { forwardRef, memo } from 'react'
import { CanvasUndoChip } from './components/CanvasUndoChip'
import { NearestTeamTag } from './components/NearestTeamTag'
import { SelectedObjectBar } from './components/SelectedObjectBar'
import { SelectedSeatsBar } from './components/SelectedSeatsBar'
import { TransformLayer } from './components/TransformLayer'
import { useCanvasHandle } from './hooks/use-canvas-handle'
import { useCanvasPointer } from './hooks/use-canvas-pointer'
import { useCanvasViewModel } from './hooks/use-canvas-view-model'
import { useEditDrag } from './hooks/use-edit-drag'
import { useOffscreenTeamIndicator } from './hooks/use-offscreen-team-indicator'
import { useSelectionRouting } from './hooks/use-selection-routing'
import { useViewport } from './hooks/use-viewport'
import { useZoomControls } from './hooks/use-zoom-controls'
import type { SeatMapCanvasHandle, SeatMapCanvasProps } from './type'
import { preventContextMenu } from './utils/prevent-context-menu'
import { SeatMirrorLayer } from '@/components/SeatMirrorLayer'
import { ZoomControls } from '@/components/ZoomControls'
import { useGlobalAnnouncement } from '@/contexts/announcement-context'
import { SEATMAP_BG_ID } from '@/utils/seatmap-bg-id'
import styles from '@/components/seatmap.module.css'

// 02/11: 座席マップのキャンバス。パンズーム・チームアイランド・施設・編集ドラッグを束ねる。
// 11: チーム箱は team.area(サーバ座標)をそのまま描画する。座席からの逆算(旧 deriveTeamArea)は
// 箱同士の重なりを生む原因だったため廃止(編集モードの自動整列は utils/layout/layout-actions 側で完結)

export type { SeatMapCanvasHandle } from './type'

export const SeatMapCanvas = memo(
  forwardRef<SeatMapCanvasHandle, SeatMapCanvasProps>(function SeatMapCanvas(
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

    useCanvasHandle(ref, viewport, edit.undoChip.showAt)
    const routing = useSelectionRouting(isEditMode, edit, view)

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
        onClick={routing.handleBackgroundClick}
        onContextMenu={preventContextMenu}
      >
        <TransformLayer
          layerRef={viewport.layerRef}
          layout={layout}
          view={view}
          edit={edit}
          isEditMode={isEditMode}
          repositioningRef={repositioningRef}
          canUndo={canUndo}
          facilityStateById={facilityStateById}
          onFacilitySelect={onFacilitySelect}
          onFacilityHover={onFacilityHover}
          onEnterEditSession={onEnterEditSession}
        />
        {/* 座席は個人カードとして描画しない。sr-only ミラー層のみがキーボード/スクリーンリーダー経路と、
          編集セッション中の座席選択入口を提供する */}
        <SeatMirrorLayer
          seats={layout.seats}
          employeeById={employeeById}
          teams={layout.teams}
          selectedSeatIds={isEditMode ? edit.editSelectedSeatIds : undefined}
          onSelect={routing.handleMirrorSelect}
        />
        <NearestTeamTag isEditMode={isEditMode} offscreen={offscreen} />
        {/* 原本には常時表示の凡例パネルは無い(チーム名は各アイランドのラベル板で表示) */}
        <ZoomControls
          onZoomIn={zoom.zoomIn}
          onZoomOut={zoom.zoomOut}
          onReset={zoom.reset}
          onGoToMySeat={onGoToMySeat}
        />
        <SelectedSeatsBar
          isEditMode={isEditMode}
          edit={edit}
          layout={layout}
          employeeById={employeeById}
          onSeatAssignRequest={onSeatAssignRequest}
          onSeatRotateRequest={onSeatRotateRequest}
          onSeatShapeRequest={onSeatShapeRequest}
          onSeatDeleteRequest={onSeatDeleteRequest}
          onSeatBulkDeleteRequest={onSeatBulkDeleteRequest}
        />
        <SelectedObjectBar
          isEditMode={isEditMode}
          view={view}
          edit={edit}
          repositioningRef={repositioningRef}
          onObjectLockToggle={onObjectLockToggle}
          onObjectLabelToggle={onObjectLabelToggle}
          onObjectDeleteRequest={onObjectDeleteRequest}
        />
        <CanvasUndoChip isEditMode={isEditMode} edit={edit} canUndo={canUndo} onUndo={onUndo} />
      </div>
    )
  })
)
