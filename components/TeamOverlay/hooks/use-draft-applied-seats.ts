import { useMemo } from 'react'
import type { SeatDraftState } from './use-seat-draft-state'
import type { Seat } from '@/types'

// STEP C4: 検索シート・一括配置へ渡す「全座席」を下書き反映済みにする。base(保存済み)配列の
// ままだと同一セッション内で行った配属がシートから見えず、「この人は今どこに座っているか」の
// 判定が保存済みの席を指し続けて同じ人を複数席へ重複配置してしまう。反映順は
// ①削除済みを除く → ②割当上書きを適用 → ③追加席を足す、の3段で固定する
//
// 差分の無い席は同じオブジェクト参照のまま返す。毎回 { ...seat } すると下流の memo(EmployeeAssignSheet
// 側の候補一覧など)が全席分で剥がれ、席が数十件あるチームで体感できるほど重くなる

export const useDraftAppliedSeats = (allSeats: Seat[], draft: SeatDraftState): Seat[] => {
  const { addedSeats, removedSeatIds, resolveEffectiveEmployeeId } = draft

  return useMemo(() => {
    const kept: Seat[] = []
    for (const seat of allSeats) {
      // ①削除済みを除く
      if (removedSeatIds.has(seat.id)) continue
      // ②割当上書きを適用。上書きが無ければ resolveEffectiveEmployeeId は savedEmployeeId を
      // そのまま返すため、その場合は元の seat 参照をそのまま積む(新規オブジェクトを作らない)
      const effectiveEmployeeId = resolveEffectiveEmployeeId(seat.id, seat.employeeId)
      kept.push(effectiveEmployeeId === seat.employeeId ? seat : { ...seat, employeeId: effectiveEmployeeId })
    }
    // ③追加席を足す
    return addedSeats.length > 0 ? [...kept, ...addedSeats] : kept
  }, [allSeats, addedSeats, removedSeatIds, resolveEffectiveEmployeeId])
}
