import type { Seat } from '@/types'

// 「今どこに座っているか」の唯一の判定口。座席配列を先頭から走査し、最初に見つかった席を
// その社員の現在席とする(utils/layout/layout-actions.ts の seat-assign-employee が使う find と同じ先勝ち)。
// 検索シート(use-employee-assign)だけでなく、部署一括配置(plan-bulk-assign)・下書きの配属
// (use-seat-draft-state)・配属確認(use-overlay-assign)もこの1本を通す — 走査を各所で書くと
// 先勝ち/後勝ちが食い違い、同じ人が2席に見える原因になる
export const buildSeatByEmployee = (seats: Seat[]): Map<string, Seat> => {
  const map = new Map<string, Seat>()
  for (const seat of seats) {
    if (seat.employeeId && !map.has(seat.employeeId)) map.set(seat.employeeId, seat)
  }
  return map
}
