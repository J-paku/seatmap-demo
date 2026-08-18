import { useCallback, useState } from 'react'
import type { UseOverlayEditModeResult } from './use-overlay-edit-mode'
import { useSeatCommit } from './use-seat-commit'
import type { UseSeatCommitResult } from './use-seat-commit'
import { TOAST_MESSAGES } from '@/utils/toast-messages'
import type { Employee, TeamOverlayPayload } from '@/types'

// 編集セッションの畳み方だけを持つ。保存・取消・未保存のまま閉じようとした時の破棄確認・
// チーム削除。どれも「このセッションをどう終わらせるか」という1つの責務に属する

type Params = {
  payload: TeamOverlayPayload | null
  editMode: UseOverlayEditModeResult
  employeeById: Map<string, Employee>
  announce: (message: string) => void
  onClose: () => void
}

export type UseOverlaySessionExitResult = {
  seatCommit: UseSeatCommitResult
  handleSaveEdit: () => void
  handleCancelEdit: () => void
  // 未保存の変更があるか。編集ドックの保存可否と閉じる確認が同じこの1本を見る
  hasEditChanges: boolean
  // 編集中に閉じようとした時の破棄確認
  isDiscardConfirmOpen: boolean
  confirmDiscardClose: () => void
  cancelDiscardClose: () => void
  // §06-6 チーム削除。タイプ確認モーダルを挟んでから team-delete する
  isTeamDeleteConfirmOpen: boolean
  requestTeamDelete: () => void
  confirmTeamDelete: () => void
  cancelTeamDelete: () => void
  // 閉じる口。✕・背景・Esc・下スワイプの全経路がこれを通る
  guardedClose: () => void
}

export const useOverlaySessionExit = ({
  payload,
  editMode,
  employeeById,
  announce,
  onClose,
}: Params): UseOverlaySessionExitResult => {
  // STEP A5→D3: 保存(commit)の呼び口。呼び出すのは編集ドック(EditDock)の保存ボタンだけにする
  const seatCommit = useSeatCommit({
    teamId: payload?.teamId ?? null,
    grid: editMode.grid,
    draft: editMode.draft,
    isGridChanged: editMode.isGridChanged,
  })

  // STEP D3: 保存経路はこの1本だけにする(ヘッダー「終了」はもうcommitを兼ねない)。
  // 保存後はeditMode.cancelで編集モードを抜ける — 抜けずに居続けると、既に確定済みの
  // draft.addedSeats/gridがそのまま残り、再度保存を押した時に同じ席を二重追加してしまうため。
  // isSaving中の二重押下はここで弾く
  const handleSaveEdit = useCallback(() => {
    if (seatCommit.isSaving) return
    void seatCommit.commit().then((result) => {
      editMode.cancel()
      // §06-5: 重複配属を畳んだ時は警告を優先する。トーストは1本しか出せない(後勝ちで上書き
      // される)ため、成功と警告を続けて流さず、どちらか一方だけを出す
      const dedupeWarnings = result.dedupedEmployeeIds.map((employeeId) =>
        TOAST_MESSAGES.ASSIGN_DEDUPED.replace('{name}', employeeById.get(employeeId)?.name ?? employeeId)
      )
      if (dedupeWarnings.length > 0) {
        announce(`[warning]${dedupeWarnings.join(' ')}`)
        return
      }
      announce(`[success]${TOAST_MESSAGES.SAVE_SUCCESS}`)
    })
  }, [seatCommit, editMode, announce, employeeById])

  // 取消(破棄)。ドックのキャンセルボタンとヘッダーの「終了」ボタンの両方から呼ぶ唯一の経路。
  // editMode.cancelは既に確定保存された内容までは打ち消さない(grid/draft/isEditModeの後始末のみ)ため、
  // 確認は挟まない
  const handleCancelEdit = useCallback(() => {
    editMode.cancel()
    announce('[info]編集をキャンセルしました')
  }, [editMode, announce])

  // 指摘#14: 保存可否と破棄確認の要否は同じ判定を使う。判定式自体はuseSeatCommit.hasChangesに
  // 一本化した(use-seat-commit.tsのcommit早期returnと同じ式をここで再定義しない)。
  // ここはそれを消費するだけ
  const hasEditChanges = seatCommit.hasChanges

  // 編集中に閉じる操作が来た時の破棄確認。開いている間だけ確認ダイアログを出す
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false)

  // ✕・背景・Esc・下スワイプの唯一の閉じる口。編集中でも閉じられるが、未保存の変更が
  // あるときだけ破棄確認を挟む(無言で捨てない)。変更が無ければそのまま編集モードを畳んで閉じる。
  // 指摘#11: depsをeditMode全体ではなくeditMode.isEditMode/editMode.cancelに絞る。editMode
  // (use-overlay-edit-mode.tsの戻り値)はdraftが毎レンダー新規オブジェクトのためオブジェクト
  // 全体としては完全には安定しない。ここで実際に使うのはisEditMode(値比較)とcancel
  // (use-overlay-edit-mode.ts側でdraft.clearDraftに絞られ恒常的に安定)の2つだけなので、
  // 個別フィールドに絞ってguardedClose自体の参照を安定させ、useModalShellのwindow keydown
  // リスナーが毎レンダー再登録されるのを防ぐ
  const guardedClose = useCallback(() => {
    if (!editMode.isEditMode) {
      onClose()
      return
    }
    if (hasEditChanges) {
      setIsDiscardConfirmOpen(true)
      return
    }
    editMode.cancel()
    onClose()
  }, [editMode.isEditMode, editMode.cancel, hasEditChanges, onClose])

  const confirmDiscardClose = useCallback(() => {
    setIsDiscardConfirmOpen(false)
    editMode.cancel()
    announce('[info]編集を破棄して閉じました')
    onClose()
  }, [editMode, announce, onClose])

  const cancelDiscardClose = useCallback(() => setIsDiscardConfirmOpen(false), [])

  // §06-6 チーム削除。確定するとレイアウトからチームと所属座席が消えるため、オーバーレイ自体も
  // 一緒に閉じる(消えたチームの座席グリッドを開いたまま残さない)
  const [isTeamDeleteConfirmOpen, setIsTeamDeleteConfirmOpen] = useState(false)
  const requestTeamDelete = useCallback(() => setIsTeamDeleteConfirmOpen(true), [])
  const cancelTeamDelete = useCallback(() => setIsTeamDeleteConfirmOpen(false), [])

  const teamName = payload?.teamName ?? ''
  const confirmTeamDelete = useCallback(() => {
    if (seatCommit.isSaving) return
    setIsTeamDeleteConfirmOpen(false)
    void seatCommit.deleteTeam().then(() => {
      editMode.cancel()
      announce(`[success]${TOAST_MESSAGES.DELETE_TEAM_SUCCESS.replace('{name}', teamName)}`)
      onClose()
    })
  }, [seatCommit, editMode, announce, teamName, onClose])

  return {
    seatCommit,
    handleSaveEdit,
    handleCancelEdit,
    hasEditChanges,
    isDiscardConfirmOpen,
    confirmDiscardClose,
    cancelDiscardClose,
    isTeamDeleteConfirmOpen,
    requestTeamDelete,
    confirmTeamDelete,
    cancelTeamDelete,
    guardedClose,
  }
}
