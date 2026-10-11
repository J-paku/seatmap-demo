import { useCallback, useState } from 'react'
import type { SeatDraftState } from './use-seat-draft-state'
import { EMPTY_COMMIT_RESULT, normalizeDraftIntoLayout } from '../utils/commit-seat-draft'
import type { SeatCommitResult } from '../utils/commit-seat-draft'
import type { SeatGridDraft } from '@/utils/layout/seat-grid-draft'
import { applyLayoutAction } from '@/utils/layout/layout-actions'
import { FINISH_DELAY_MS } from '@/utils/save-delay'
import { fetchMock } from '@/lib/fetch-mock'
import { useSeatLayout } from '@/hooks/use-mock-data'

// STEP A5: 座席編集(draft + grid)の確定(commit)。use-layout-editorが使うreducer
// (applyLayoutAction)をそのまま呼び、確定IDの採番方式(既存の最大連番+1)を二重化しない。
// 保存経路もuse-layout-saveと同じ(fetchMockの疑似遅延 → useSeatLayoutのpersistLayout)を
// そのまま使う。オーバーレイ専用の保存手段は作らない
//
// use-layout-editorのセッション(enterEditMode/dispatch/finishEdit)は使わない — それを起動すると
// editor.isEditModeがtrueになり、TeamOverlayの表示条件(!editor.isEditMode)によりオーバーレイ自体が
// 閉じてしまう。オーバーレイを開いたまま保存する必要があるため、reducerだけを直接呼ぶ

export type UseSeatCommitParams = {
  teamId: string | null
  grid: SeatGridDraft | null
  draft: SeatDraftState
  // 行・列の増減と席の移動・グリッドからの除去はgridにしか現れず、draft.changeCountでは
  // 1件も数えられない。draftだけで保存要否を決めると、それらの編集が無言で捨てられる
  isGridChanged: boolean
}

export type UseSeatCommitResult = {
  isSaving: boolean
  // 指摘#14: 「未保存の変更あり」判定の唯一の定義。draft.changeCountだけでは行・列の増減や
  // 席の移動(gridにしか現れない)を取りこぼすため、isGridChangedと併せて見る。下のcommitの
  // 保存可否判定と呼び出し側(use-overlay-edit-wiring.tsのhasEditChanges)はどちらもこの1本を
  // 消費するだけにし、同じ判定式を2箇所で再定義しない
  hasChanges: boolean
  // 下書きを確定して保存する。変更0件(draft・gridとも無変更)・grid未確立・teamId未確定の
  // いずれかなら何もしない(保存もトーストも発生させない)
  commit: () => Promise<SeatCommitResult>
  // §06-6: オーバーレイのフッターから呼ぶチーム削除。座席の後始末はreducerのteam-delete側が
  // 担うため、ここでは下書き(draft/grid)には触れず保存済みレイアウトだけを差し替える
  deleteTeam: () => Promise<void>
}

export const useSeatCommit = ({
  teamId,
  grid,
  draft,
  isGridChanged,
}: UseSeatCommitParams): UseSeatCommitResult => {
  const { layout, persistLayout } = useSeatLayout()
  const [isSaving, setIsSaving] = useState(false)

  const hasChanges = draft.changeCount > 0 || isGridChanged

  const commit = useCallback(async (): Promise<SeatCommitResult> => {
    if (!hasChanges || !grid || !layout || !teamId) return EMPTY_COMMIT_RESULT
    // ボタン押下時点のdraft/gridをその場で正規化してから保存する(use-layout-save.finishと同じ順序:
    // 保存対象を確定 → 疑似遅延 → persistLayout)
    const next = normalizeDraftIntoLayout(layout, teamId, grid, draft)
    setIsSaving(true)
    await fetchMock(true, FINISH_DELAY_MS)
    await persistLayout(next.layout)
    setIsSaving(false)
    return { dedupedEmployeeIds: next.dedupedEmployeeIds }
  }, [hasChanges, draft, grid, layout, persistLayout, teamId])

  const deleteTeam = useCallback(async () => {
    if (!layout || !teamId) return
    const next = applyLayoutAction(layout, { type: 'team-delete', teamId })
    setIsSaving(true)
    await fetchMock(true, FINISH_DELAY_MS)
    await persistLayout(next)
    setIsSaving(false)
  }, [layout, persistLayout, teamId])

  return { isSaving, hasChanges, commit, deleteTeam }
}
