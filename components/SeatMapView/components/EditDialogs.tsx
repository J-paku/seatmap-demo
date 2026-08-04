import { DeleteConfirmDialog } from '@/components/edit/DeleteConfirmDialog'
import { ObjectDeleteDialog } from '@/components/edit/ObjectDeleteDialog'
import { TeamChangeSheet } from '@/components/edit/TeamChangeSheet'
import { TeamRelayoutModal } from '@/components/edit/TeamRelayoutModal'
import { resolveTeamColor } from '@/utils/team-colors'
import { useTeamColorMap } from '@/hooks/use-team-color-map'
import type { LayoutEditor } from '../type'
import type { useEditDialogs } from '../hooks/use-edit-dialogs'

// 07: 編集モードから開く3つのダイアログ。開閉状態は useEditDialogs が持つ

type Props = {
  editor: LayoutEditor
  dialogs: ReturnType<typeof useEditDialogs>
}

export const EditDialogs = ({ editor, dialogs }: Props) => {
  const teamColorMap = useTeamColorMap()

  return (
    <>
      {dialogs.deleteConfirmSeatId && (
        <DeleteConfirmDialog
          employeeName={dialogs.deleteTargetEmployeeName}
          onCancel={dialogs.closeDeleteConfirm}
          onConfirm={() => {
            editor.deleteSeat(dialogs.deleteConfirmSeatId as string)
            dialogs.closeDeleteConfirm()
          }}
        />
      )}

      {dialogs.deleteObjectTarget && (
        <ObjectDeleteDialog
          facilityName={dialogs.deleteObjectTarget.name}
          onCancel={dialogs.closeObjectDelete}
          onConfirm={dialogs.confirmObjectDelete}
        />
      )}

      {dialogs.teamChangeSeatId && dialogs.teamChangeTargetSeat && editor.editingLayout && (
        <TeamChangeSheet
          teams={editor.editingLayout.teams}
          currentTeamId={dialogs.teamChangeTargetSeat.teamId}
          colorOf={(teamId, teamName) => resolveTeamColor(teamColorMap, teamId, teamName)}
          onSelect={(teamId) => {
            editor.assignSeat(dialogs.teamChangeSeatId as string, teamId)
            dialogs.closeTeamChange()
          }}
          onClose={dialogs.closeTeamChange}
        />
      )}

      {dialogs.relayoutTeamId && dialogs.relayoutTargetTeam && (
        <TeamRelayoutModal
          team={dialogs.relayoutTargetTeam}
          seatCount={dialogs.relayoutTargetSeatCount}
          onApply={(rows, cols) => editor.relayoutTeam(dialogs.relayoutTeamId as string, rows, cols)}
          onClose={dialogs.closeRelayout}
        />
      )}
    </>
  )
}
