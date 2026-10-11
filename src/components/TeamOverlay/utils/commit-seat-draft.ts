import type { SeatDraftState } from '../hooks/use-seat-draft-state'
import { serializeSeatGrid } from '@/utils/layout/seat-grid-draft'
import type { SeatGridDraft } from '@/utils/layout/seat-grid-draft'
import { applyLayoutAction } from '@/utils/layout/layout-actions'
import type { Seat, SeatLayout } from '@/types'

// 座席編集の確定(use-seat-commit)が使う、下書きをレイアウトへ畳み込む正規化と保存まわりの値

// use-layout-save.ts のFINISH_DELAY_MSと同じ値(保存中の体感を全画面で揃える)
export const FINISH_DELAY_MS = 400

// §06-5 重複配属デデュプ: 1人が複数席に居る場合、最後に配置した席だけ残して他を空席化する。
// 「最後に配置した席」は座席配列の後ろにある席とみなす — reducer(seat-add)は新しい席を必ず
// 末尾へ積むため、下書きで後から置いた席ほど後ろに来る。判定はこの1本だけに置き、
// 呼び出し側では数え直さない(同じ概念の判定基準を二重に持たないため)
const dedupeSeatAssignments = (seats: Seat[]): { seats: Seat[]; dedupedEmployeeIds: string[] } => {
  // 空席(null)の位置も記録するが、下の map は空席を先に素通りさせるので読まれない
  const lastIndexByEmployeeId = new Map<string | null, number>()
  seats.forEach((seat, index) => {
    lastIndexByEmployeeId.set(seat.employeeId, index)
  })
  const dedupedEmployeeIds: string[] = []
  const nextSeats = seats.map((seat, index) => {
    const employeeId = seat.employeeId
    if (employeeId === null) return seat
    if (lastIndexByEmployeeId.get(employeeId) === index) return seat
    if (!dedupedEmployeeIds.includes(employeeId)) dedupedEmployeeIds.push(employeeId)
    return { ...seat, employeeId: null }
  })
  return { seats: nextSeats, dedupedEmployeeIds }
}

// 正規化の順序は固定。入れ替えると削除済み席のIDを新規座席が引き継ぐ等の取り違えが起きる
// (1)座標確定 → (2)削除除外 → (3)仮ID確定 → (4)割当反映 → (5)回転反映 → (6)重複配属デデュプ
//   → (7)フリーアドレス設定(チーム属性)反映
export const normalizeDraftIntoLayout = (
  layout: SeatLayout,
  teamId: string,
  grid: SeatGridDraft,
  draft: SeatDraftState
): { layout: SeatLayout; dedupedEmployeeIds: string[] } => {
  // (1) 座標確定: グリッド全セルを均一ピッチの絶対座標へ直列化する(仮ID・確定IDは区別しない)
  const positions = serializeSeatGrid(grid)
  // (2) 削除席を結果配列から除く
  const survivors = positions.filter(p => !draft.removedSeatIds.has(p.seatId))
  const positionById = new Map(survivors.map(p => [p.seatId, p]))
  const addedIds = new Set(draft.addedSeats.map(s => s.id))

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
    if (next.seats.length > beforeCount)
      finalIdByDraftId.set(seat.id, next.seats[next.seats.length - 1].id)
  }

  // (4) 割当を反映する。既存座席はassignmentsOverride、追加座席は下書き自身が持つemployeeIdから
  for (const [seatId, value] of draft.assignmentsOverride) {
    next = applyLayoutAction(next, {
      type: 'seat-assign-employee',
      seatId,
      employeeId: value === '' ? null : value,
    })
  }
  for (const seat of draft.addedSeats) {
    const finalId = finalIdByDraftId.get(seat.id)
    if (finalId && seat.employeeId) {
      next = applyLayoutAction(next, {
        type: 'seat-assign-employee',
        seatId: finalId,
        employeeId: seat.employeeId,
      })
    }
  }

  // (5) 回転を反映する。reducerに座席回転アクションが無いため座席配列を直接パッチする
  const rotationById = new Map<string, Seat['rotation']>(draft.rotationOverrides)
  for (const seat of draft.addedSeats) {
    const finalId = finalIdByDraftId.get(seat.id)
    // 回転0の席も積む。seat-add は回転0で席を作るので、積んでも席の中身は変わらない
    if (finalId) rotationById.set(finalId, seat.rotation)
  }
  if (rotationById.size > 0) {
    next = {
      ...next,
      seats: next.seats.map(s => {
        const rotation = rotationById.get(s.id)
        return rotation === undefined ? s : { ...s, rotation }
      }),
    }
  }

  // (6) 重複配属デデュプ。ここまでの適用は席ごとの独立操作なので、1人が複数席に残る組み合わせを
  // 作れてしまう(下書き反映前の席へ後から人を戻した場合など)。保存直前に1回だけ畳む
  const deduped = dedupeSeatAssignments(next.seats)
  if (deduped.dedupedEmployeeIds.length > 0) next = { ...next, seats: deduped.seats }

  // (7) §06-5: フリーアドレス設定が変わった場合のみチーム属性も同じ結果へ畳み込む。
  // ここまでで next には座席の確定結果が既に入っているので、team-replace-all を重ねた
  // 結果を1つのレイアウトとして持ち出せる — 呼び出し側の保存(persistLayout)は1回で、
  // チーム属性と座席が別々の保存に割れない(§06-5「保存中ガードで2発目が落ちるのを防ぐ」)。
  // team-replace-all はチーム配列だけを差し替える(座席には触らない)アクションで、その意味は
  // ここでも変えていない。座席側は上の (1)〜(6) が既に済ませている
  if (draft.freeAddressOverride !== null) {
    const freeAddressEnabled = draft.freeAddressOverride
    next = applyLayoutAction(next, {
      type: 'team-replace-all',
      teams: next.teams.map(t => (t.id === teamId ? { ...t, freeAddressEnabled } : t)),
    })
  }

  return { layout: next, dedupedEmployeeIds: deduped.dedupedEmployeeIds }
}

// 保存の結果。§06-5 のデデュプ警告は「誰が畳まれたか」を呼び出し側の文言組み立てへ渡すだけにし、
// このフックからは通知(announce/トースト)を一切出さない(通知経路を1画面に2つ作らないため)
export type SeatCommitResult = {
  dedupedEmployeeIds: string[]
}

export const EMPTY_COMMIT_RESULT: SeatCommitResult = { dedupedEmployeeIds: [] }
