import { ConfirmDialog, buildTeamDeleteConfirmMessage } from '@/components/edit/ConfirmDialog'
import { DeleteConfirmDialog } from '@/components/edit/DeleteConfirmDialog'
import { ObjectDeleteDialog } from '@/components/edit/ObjectDeleteDialog'
import { TeamChangeSheet } from '@/components/edit/TeamChangeSheet'
import { resolveTeamColor } from '@/utils/team-colors'
import { useTeamColorMap } from '@/hooks/use-team-color-map'
import type { LayoutEditor } from '../type'
import type { useEditDialogs } from '../hooks/use-edit-dialogs'

// 07: 編集モードから開くダイアログ群。開閉状態は useEditDialogs が持つ

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

      {/* 05-3/07-3: 移動ゴーストの削除ボタンから来るチーム削除。オーバーレイ(§06-6)と同種の
          タイプ確認モーダルで、チーム名を打つまで「削除する」は押せない */}
      {dialogs.deleteTeamTarget && (
        <ConfirmDialog
          ariaLabel='チーム削除の確認'
          title='このチームを削除しますか？'
          message={buildTeamDeleteConfirmMessage(
            dialogs.deleteTeamTarget.name,
            dialogs.deleteTeamOccupiedCount,
            dialogs.deleteTeamEmptyCount
          )}
          confirmLabel='削除する'
          cancelLabel='キャンセル'
          confirmIcon='delete_forever'
          typedConfirmation={{ keyword: dialogs.deleteTeamTarget.name }}
          onConfirm={dialogs.confirmTeamDelete}
          onCancel={dialogs.closeTeamDelete}
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
    </>
  )
}
