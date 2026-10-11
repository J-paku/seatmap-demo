import { EditModeLayer } from './EditModeLayer'
import { PlacementSheets } from './PlacementSheets'
import { SeatAssignDialogs } from './SeatAssignDialogs'
import { useAdminFabVisibility } from '../hooks/use-admin-fab-visibility'
import type { EditSessionEnd } from '../hooks/use-edit-session-end'
import type { GhostDelete } from '../hooks/use-ghost-delete'
import type { LayoutSave } from '../hooks/use-layout-save'
import type { ObjectPlacement } from '../hooks/use-object-placement'
import type { PlacementEntries } from '../hooks/use-placement-entries'
import type { SeatAssign } from '../hooks/use-seat-assign'
import type { SeatBulkActions } from '../hooks/use-seat-bulk-actions'
import type { SeatMapData } from '../hooks/use-seat-map-data'
import type { SeatMapTours } from '../hooks/use-seat-map-tours'
import type { SeatNavigation } from '../hooks/use-seat-navigation'
import type { SurfaceState } from '../hooks/use-surface-state'
import type { LayoutEditor } from '../type'
import { AdminAddFab } from '@/components/AdminAddFab'
import { EditErrorToast } from '@/components/edit/EditErrorToast'

// 編集まわりの面をまとめて描く(編集モードの常駐UI・追加導線の FAB とシート・編集エラーの通知・
// 座席の配属と一括削除の確認)。削除・チーム変更のダイアログは EditDialogs が持つ

type Props = {
  editor: LayoutEditor
  data: SeatMapData
  save: LayoutSave
  placement: ObjectPlacement
  tours: SeatMapTours
  sessionEnd: EditSessionEnd
  ghostDelete: GhostDelete
  assign: SeatAssign
  seatBulk: SeatBulkActions
  entries: PlacementEntries
  surface: SurfaceState
  nav: SeatNavigation
  ensureEditSession: () => void
}

export const EditSurfaces = ({
  editor,
  data: { employeeById, directoryEmployees, effectiveLayout, placedFacilityIds },
  save,
  placement,
  tours,
  sessionEnd: { handleSessionCancel, handleSessionFinish },
  ghostDelete: { isGhostDeletable, isGhostDeleting, handleGhostDelete },
  assign,
  seatBulk: { bulkDeleteSeatIds, setBulkDeleteSeatIds, confirmBulkDelete },
  entries: { handleSelectTeam, handleSelectFacility },
  surface: { isDirectoryOpen, isLayoutSwitcherOpen, selectedSeatCount },
  nav: { focus },
  ensureEditSession,
}: Props) => {
  // 左下 FAB の可否。条件が増えても組み立てが太らないよう判定はフックへ寄せる
  const isAdminFabVisible = useAdminFabVisibility({
    teamOverlayPayload: focus.payload,
    isDirectoryOpen,
    isPlacementActive: placement.isActive,
    assignSeatId: assign.assignSeatId,
    tours: tours.tours,
    // 閲覧モードでは常に0として扱う二重の保険
    selectedSeatCount: editor.isEditMode ? selectedSeatCount : 0,
    isLayoutSwitcherOpen,
  })

  return (
    <>
      {editor.isEditMode && (
        <EditModeLayer
          changedCount={editor.changedCount}
          isSaving={save.isSaving}
          isPlacing={placement.request !== null}
          onHelp={tours.handleHelp}
          onFinish={handleSessionFinish}
          onCancel={handleSessionCancel}
        />
      )}

      {/* 追加導線。閲覧モードでも常設し、置き始めた時に編集セッションを起こす。
          シートとゴースト層を編集モードの内側に置くと、起動と同じフレームで描かれず1フレーム空く。
          ゴースト層はキャンバスの DOM 木の外に置く —
          中に入れると暗幕がキャンバスの pointerdown を奪い、配置中にパン/ズームできなくなる */}
      {isAdminFabVisible && (
        <AdminAddFab
          onSelectTeam={handleSelectTeam}
          onSelectFacility={handleSelectFacility}
          onEditLayout={ensureEditSession}
        />
      )}
      <PlacementSheets
        placement={placement}
        placedFacilityIds={placedFacilityIds}
        isGhostDeleting={isGhostDeleting}
        onGhostDelete={isGhostDeletable ? handleGhostDelete : undefined}
      />

      {editor.errorToast && (
        <EditErrorToast key={editor.errorToast.id} message={editor.errorToast.message} />
      )}

      {editor.isEditMode && (
        <SeatAssignDialogs
          assign={assign}
          employees={directoryEmployees}
          seats={effectiveLayout?.seats ?? []}
          employeeById={employeeById}
          bulkDeleteSeatIds={bulkDeleteSeatIds}
          onConfirmBulkDelete={confirmBulkDelete}
          onCancelBulkDelete={() => setBulkDeleteSeatIds(null)}
        />
      )}
    </>
  )
}
