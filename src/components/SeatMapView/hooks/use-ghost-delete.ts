import { useCallback } from 'react'
import type { useEditDialogs } from './use-edit-dialogs'
import type { ObjectPlacement } from './use-object-placement'
import { canDeleteGhost, isDeleteConfirmOpen } from '../utils/judge-ghost-delete'

// 04-4: 移動ゴーストの削除ボタン。ゴーストを畳んでから既存の削除経路へ渡す
// (会議室は確認ダイアログ・チームは §07-3 のタイプ確認・家具は即時)

export type GhostDelete = {
  // 移動モードのときだけ true。新規配置では削除ボタンを出さない
  isGhostDeletable: boolean
  // 削除確認が開いている間。バーの削除ボタンを二度押しさせない
  isGhostDeleting: boolean
  handleGhostDelete: () => void
}

export const useGhostDelete = (
  placement: ObjectPlacement,
  dialogs: ReturnType<typeof useEditDialogs>
): GhostDelete => {
  const ghostDeleteRef = placement.repositioningRef
  const isGhostDeletable = canDeleteGhost(ghostDeleteRef)
  // 削除確認が開いている間 = 削除処理中とみなす。新しい state を作らずダイアログの開閉から導く —
  // 導ければ、閉じ忘れでフラグが立ちっぱなしになる経路が生まれない
  const isGhostDeleting = isDeleteConfirmOpen(dialogs.deleteObjectTarget, dialogs.deleteTeamTarget)
  const handleGhostDelete = useCallback(() => {
    if (!ghostDeleteRef) return
    // ここでセッションを畳まない。畳むのは handleDeleteObject の中、削除が成立した後だけ
    dialogs.requestObjectDelete(ghostDeleteRef)
  }, [ghostDeleteRef, dialogs.requestObjectDelete])

  return { isGhostDeletable, isGhostDeleting, handleGhostDelete }
}
