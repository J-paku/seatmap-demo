// 座席の「実在社員が着席している」判定を1箇所に統一する純関数。
// 以前はキャンバス側(use-canvas-view-model.ts の assignedCountByTeam)とチームオーバーレイ側
// (TeamOverlay/index.tsx の occupiedCount)がそれぞれ「employeeId が非null」だけで別々に判定しており、
// 存在しない社員IDを参照する座席まで数えてしまっていた(空席なのにラベルは「N名」になる不整合)。
// employeeById への実在確認をここへ1本化し、判定基準の二重化を無くす
import type { Employee, Seat, Team } from '@/types'

// employeeId が非null かつ employeeById に実在する座席だけを「着席」とみなす
const isOccupiedSeat = (seat: Seat, employeeById: Map<string, Employee>): boolean =>
  seat.employeeId !== null && employeeById.has(seat.employeeId)

// 単一チーム分の実在着席数。呼び出し側で対象チームの座席へ絞り込んだ配列を渡す
// (TeamOverlay ヘッダーの「N名」用)
export const countOccupiedSeats = (seats: Seat[], employeeById: Map<string, Employee>): number =>
  seats.filter((seat) => isOccupiedSeat(seat, employeeById)).length

// 全チーム分をまとめて1回で集計する。teams に含まれるチームは座席が1件も無くても0で埋め、
// teams に無いチームの座席は数えない(キャンバスのチームラベル「N名」用)
export const countOccupiedSeatsByTeam = (
  seats: Seat[],
  employeeById: Map<string, Employee>,
  teams: Team[]
): Map<string, number> => {
  const counts = new Map<string, number>()
  for (const team of teams) counts.set(team.id, 0)
  for (const seat of seats) {
    if (!counts.has(seat.teamId)) continue
    if (!isOccupiedSeat(seat, employeeById)) continue
    counts.set(seat.teamId, (counts.get(seat.teamId) ?? 0) + 1)
  }
  return counts
}
