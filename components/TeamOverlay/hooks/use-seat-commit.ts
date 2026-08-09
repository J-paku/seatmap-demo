import { useCallback, useState } from 'react'
import type { SeatDraftState } from './use-seat-draft-state'
import { serializeSeatGrid } from '@/utils/layout/seat-grid-draft'
import type { SeatGridDraft } from '@/utils/layout/seat-grid-draft'
import { applyLayoutAction } from '@/utils/layout/layout-actions'
import { fetchMock } from '@/lib/fetch-mock'
import { useSeatLayout } from '@/hooks/use-mock-data'
import type { Seat, SeatLayout } from '@/types'

// STEP A5: 座席編集(draft + grid)の確定(commit)。use-layout-editorが使うreducer
// (applyLayoutAction)をそのまま呼び、確定IDの採番方式(既存の最大連番+1)を二重化しない。
// 保存経路もuse-layout-saveと同じ(fetchMockの疑似遅延 → useSeatLayoutのpersistLayout)を
// そのまま使う。オーバーレイ専用の保存手段は作らない
//
// use-layout-editorのセッション(enterEditMode/dispatch/finishEdit)は使わない — それを起動すると
// editor.isEditModeがtrueになり、TeamOverlayの表示条件(!editor.isEditMode)によりオーバーレイ自体が
// 閉じてしまう。オーバーレイを開いたまま保存する必要があるため、reducerだけを直接呼ぶ

// use-layout-save.ts のFINISH_DELAY_MSと同じ値(保存中の体感を全画面で揃える)
const FINISH_DELAY_MS = 400

// 正規化の順序は固定。入れ替えると削除済み席のIDを新規座席が引き継ぐ等の取り違えが起きる
// (1)座標確定 → (2)削除除外 → (3)仮ID確定 → (4)割当反映 → (5)回転反映
const normalizeDraftIntoLayout = (
  layout: SeatLayout,
  teamId: string,
  grid: SeatGridDraft,
  draft: SeatDraftState
): SeatLayout => {
  // (1) 座標確定: グリッド全セルを均一ピッチの絶対座標へ直列化する(仮ID・確定IDは区別しない)
  const positions = serializeSeatGrid(grid)
  // (2) 削除席を結果配列から除く
  const survivors = positions.filter((p) => !draft.removedSeatIds.has(p.seatId))
  const positionById = new Map(survivors.map((p) => [p.seatId, p]))
  const addedIds = new Set(draft.addedSeats.map((s) => s.id))

  let next = layout

  // 削除の適用(結果配列には残らないが、layout.seatsからも消す)
  for (const seatId of draft.removedSeatIds) {
    next = applyLayoutAction(next, { type: 'seat-delete', seatId })
  }

  // 既存座席(仮IDでない)の座標をグリッド確定値へ合わせる
  for (const p of survivors) {
    if (addedIds.has(p.seatId)) continue
    next = applyLayoutAction(next, { type: 'seat-move', seatId: p.seatId, x: p.x, y: p.y })
  }

  // (3) 仮ID確定: addSeatと同じreducer(seat-add)を通し、既存の最大連番+1方式で確定IDを採番する。
  // グリッドへ未配置の下書き座席(positionByIdに無い)は保存しない
  const finalIdByDraftId = new Map<string, string>()
  for (const seat of draft.addedSeats) {
    const p = positionById.get(seat.id)
    if (!p) continue
    const beforeCount = next.seats.length
    next = applyLayoutAction(next, { type: 'seat-add', teamId, x: p.x, y: p.y })
    if (next.seats.length > beforeCount) finalIdByDraftId.set(seat.id, next.seats[next.seats.length - 1].id)
  }

  // (4) 割当を反映する。既存座席はassignmentsOverride、追加座席は下書き自身が持つemployeeIdから
  for (const [seatId, value] of draft.assignmentsOverride) {
    next = applyLayoutAction(next, { type: 'seat-assign-employee', seatId, employeeId: value === '' ? null : value })
  }
  for (const seat of draft.addedSeats) {
    const finalId = finalIdByDraftId.get(seat.id)
    if (finalId && seat.employeeId) {
      next = applyLayoutAction(next, { type: 'seat-assign-employee', seatId: finalId, employeeId: seat.employeeId })
    }
  }

  // (5) 回転を反映する。reducerに座席回転アクションが無いため座席配列を直接パッチする
  const rotationById = new Map<string, Seat['rotation']>(draft.rotationOverrides)
  for (const seat of draft.addedSeats) {
    const finalId = finalIdByDraftId.get(seat.id)
    if (finalId && seat.rotation !== 0) rotationById.set(finalId, seat.rotation)
  }
  if (rotationById.size > 0) {
    next = {
      ...next,
      seats: next.seats.map((s) => {
        const rotation = rotationById.get(s.id)
        return rotation === undefined ? s : { ...s, rotation }
      }),
    }
  }

  return next
}

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
  commit: () => Promise<void>
}

export const useSeatCommit = ({ teamId, grid, draft, isGridChanged }: UseSeatCommitParams): UseSeatCommitResult => {
  const { layout, persistLayout } = useSeatLayout()
  const [isSaving, setIsSaving] = useState(false)

  const hasChanges = draft.changeCount > 0 || isGridChanged

  const commit = useCallback(async () => {
    if (!hasChanges || !grid || !layout || !teamId) return
    // ボタン押下時点のdraft/gridをその場で正規化してから保存する(use-layout-save.finishと同じ順序:
    // 保存対象を確定 → 疑似遅延 → persistLayout)
    const next = normalizeDraftIntoLayout(layout, teamId, grid, draft)
    setIsSaving(true)
    await fetchMock(true, FINISH_DELAY_MS)
    await persistLayout(next)
    setIsSaving(false)
  }, [hasChanges, draft, grid, layout, persistLayout, teamId])

  return { isSaving, hasChanges, commit }
}
