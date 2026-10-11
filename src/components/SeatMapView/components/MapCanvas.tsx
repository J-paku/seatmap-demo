import type { RefObject } from 'react'
import type { useEditDialogs } from '../hooks/use-edit-dialogs'
import type { LayoutSave } from '../hooks/use-layout-save'
import type { ObjectPlacement } from '../hooks/use-object-placement'
import type { PlacementEntries } from '../hooks/use-placement-entries'
import type { SeatAssign } from '../hooks/use-seat-assign'
import type { SeatBulkActions } from '../hooks/use-seat-bulk-actions'
import type { SeatMapData } from '../hooks/use-seat-map-data'
import type { SeatNavigation } from '../hooks/use-seat-navigation'
import type { SurfaceState } from '../hooks/use-surface-state'
import type { LayoutEditor } from '../type'
import { SeatMapCanvas } from '@/components/SeatMapCanvas'
import type { SeatMapCanvasHandle } from '@/components/SeatMapCanvas'
import { useDetailPanel } from '@/contexts/detail-panel-context'
import type { SeatLayout } from '@/types'

// キャンバスの面。閲覧の口(詳細・オーバーレイ・ホバー・自分の席)と
// 編集の口(選択・配属・削除・移動・属性・セッションの出入り)を SeatMapCanvas へ渡す

type Props = {
  canvasRef: RefObject<SeatMapCanvasHandle | null>
  // 読み込みが済んだレイアウト。未取得の間は呼び出し側がこの面ごと出さない
  effectiveLayout: SeatLayout
  data: SeatMapData
  editor: LayoutEditor
  placement: ObjectPlacement
  dialogs: ReturnType<typeof useEditDialogs>
  assign: SeatAssign
  seatBulk: SeatBulkActions
  save: LayoutSave
  surface: SurfaceState
  nav: SeatNavigation
  entries: PlacementEntries
  ensureEditSession: () => void
}

export const MapCanvas = ({
  canvasRef,
  effectiveLayout,
  data: { employeeById, facilityStateById },
  editor,
  placement,
  dialogs,
  assign,
  seatBulk: { handleSeatEnlarge, setBulkDeleteSeatIds },
  save,
  surface: { setHoverFacility, setSelectedSeatCount },
  nav: { focus, handleGoToMySeat },
  entries: { handleTeamTap },
  ensureEditSession,
}: Props) => {
  const { openSeatDetail, openFacilityDetail } = useDetailPanel()

  return (
    <SeatMapCanvas
      ref={canvasRef}
      layout={effectiveLayout}
      employeeById={employeeById}
      onSeatSelect={openSeatDetail}
      onFacilitySelect={openFacilityDetail}
      onTeamBoundaryClick={focus.openByBoundary}
      facilityStateById={facilityStateById}
      onFacilityHover={setHoverFacility}
      isEditMode={editor.isEditMode}
      onTeamTap={handleTeamTap}
      onSeatSelectionChange={setSelectedSeatCount}
      onSeatAssignRequest={assign.openAssign}
      onSeatDeleteRequest={dialogs.requestSeatDelete}
      onSeatRotateRequest={editor.rotateSeats}
      onSeatShapeRequest={handleSeatEnlarge}
      onSeatBulkDeleteRequest={setBulkDeleteSeatIds}
      onEndSession={placement.isActive ? undefined : save.cancel}
      onObjectRepositionRequest={placement.startReposition}
      onObjectDeleteRequest={dialogs.requestObjectDelete}
      onObjectLockToggle={editor.setObjectLocked}
      onObjectLabelToggle={editor.setObjectLabelVisible}
      repositioningRef={placement.repositioningRef}
      onUndo={editor.undo}
      canUndo={editor.canUndo}
      onGoToMySeat={editor.isEditMode ? undefined : handleGoToMySeat}
      onEnterEditSession={editor.isEditMode ? undefined : ensureEditSession}
    />
  )
}
