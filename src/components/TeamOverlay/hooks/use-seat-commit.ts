import { useCallback, useState } from 'react'
import type { SeatDraftState } from '../type'
import { EMPTY_COMMIT_RESULT, normalizeDraftIntoLayout } from '../utils/commit-seat-draft'
import type { SeatCommitResult } from '../utils/commit-seat-draft'
import type { SeatGridDraft } from '@/utils/layout/seat-grid-draft'
import { applyLayoutAction } from '@/utils/layout/layout-actions'
import { isCustomSaveConflict } from '@/utils/layout/judge-save-conflict'
import { VALID_EMPLOYEE_IDS } from '@/utils/collect-employee-ids'
import { FINISH_DELAY_MS } from '@/utils/save-delay'
import { fetchMock } from '@/lib/fetch-mock'
import { loadSourceLayout } from '@/lib/layout-persistence'
import { useSeatLayout } from '@/hooks/use-mock-data'
import { useLayoutSource } from '@/contexts/layout-source-context'
import type { SeatLayout } from '@/types'

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

// 保存できなかった理由。conflict = 別タブが先にカスタムレイアウトを更新していた(05-6 楽観ロック)ので
// 書き込んでいない。failed = 書き込み(localStorage・SWRのmutate)が投げた。どちらの場合も
// 下書き(draft/grid)には触れずに返す。通知は呼び出し側が出す(このフックからは出さない)
export type SeatSaveFailure = 'conflict' | 'failed'

export type UseSeatCommitResult = {
  isSaving: boolean
  // 指摘#14: 「未保存の変更あり」判定の唯一の定義。draft.changeCountだけでは行・列の増減や
  // 席の移動(gridにしか現れない)を取りこぼすため、isGridChangedと併せて見る。下のcommitの
  // 保存可否判定と呼び出し側(use-overlay-edit-wiring.tsのhasEditChanges)はどちらもこの1本を
  // 消費するだけにし、同じ判定式を2箇所で再定義しない
  hasChanges: boolean
  // 下書きを確定して保存する。変更0件(draft・gridとも無変更)・grid未確立・teamId未確定の
  // いずれかなら何もしない(保存もトーストも発生させない)。保存できなかった時はSeatSaveFailureを返す
  commit: () => Promise<SeatCommitResult | SeatSaveFailure>
  // §06-6: オーバーレイのフッターから呼ぶチーム削除。座席の後始末はreducerのteam-delete側が
  // 担うため、ここでは下書き(draft/grid)には触れず保存済みレイアウトだけを差し替える。
  // 保存できなかった時はSeatSaveFailure、それ以外はnullを返す
  deleteTeam: () => Promise<SeatSaveFailure | null>
}

export const useSeatCommit = ({
  teamId,
  grid,
  draft,
  isGridChanged,
}: UseSeatCommitParams): UseSeatCommitResult => {
  const { layout, persistLayout } = useSeatLayout()
  const { source } = useLayoutSource()
  const [isSaving, setIsSaving] = useState(false)

  const hasChanges = draft.changeCount > 0 || isGridChanged

  // 疑似遅延 → 楽観ロックの照合 → 書き込み。use-layout-save.finishと同じ順序で、照合の基準は
  // 保存対象の元にした表示中レイアウト(base)の版。失敗しても保存中フラグは必ず下ろす
  // (下ろし忘れると保存ボタン・削除ボタンが無効のまま戻らない)
  const save = useCallback(
    async (base: SeatLayout, next: SeatLayout): Promise<SeatSaveFailure | null> => {
      setIsSaving(true)
      try {
        await fetchMock(true, FINISH_DELAY_MS)
        // 05-6: 楽観ロックの照合相手。照合するのはカスタムだけ(公式は仕様上競合検知なし)なので、
        // 読み直すのもカスタムの保存分だけにする(公式の保存分まで読むと、壊れた保存分を消す副作用が
        // 照合のためだけに起きる)。読み込み口と実在社員id集合はuse-layout-saveと同じものを使う
        const currentStored =
          source.type === 'custom' ? loadSourceLayout(source, VALID_EMPLOYEE_IDS) : null
        if (isCustomSaveConflict(source, base.updatedTime, currentStored)) return 'conflict'
        await persistLayout(next)
        return null
      } catch {
        return 'failed'
      } finally {
        setIsSaving(false)
      }
    },
    [persistLayout, source]
  )

  const commit = useCallback(async (): Promise<SeatCommitResult | SeatSaveFailure> => {
    if (!hasChanges || !grid || !layout || !teamId) return EMPTY_COMMIT_RESULT
    // ボタン押下時点のdraft/gridをその場で正規化してから保存する(use-layout-save.finishと同じ順序:
    // 保存対象を確定 → 疑似遅延 → persistLayout)
    const next = normalizeDraftIntoLayout(layout, teamId, grid, draft)
    const failure = await save(layout, next.layout)
    if (failure) return failure
    return { dedupedEmployeeIds: next.dedupedEmployeeIds }
  }, [hasChanges, draft, grid, layout, save, teamId])

  const deleteTeam = useCallback(async (): Promise<SeatSaveFailure | null> => {
    if (!layout || !teamId) return null
    const next = applyLayoutAction(layout, { type: 'team-delete', teamId })
    return save(layout, next)
  }, [layout, save, teamId])

  return { isSaving, hasChanges, commit, deleteTeam }
}
