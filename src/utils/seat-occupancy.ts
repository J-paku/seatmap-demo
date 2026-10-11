// 座席の「実在社員が着席している」判定を1箇所に統一する純関数。
// 以前はキャンバス側(use-canvas-view-model.ts の assignedCountByTeam)とチームオーバーレイ側
// (TeamOverlay/index.tsx の occupiedCount)がそれぞれ「employeeId が非null」だけで別々に判定しており、
// 存在しない社員IDを参照する座席まで数えてしまっていた(空席なのにラベルは「N名」になる不整合)。
// employeeById への実在確認をここへ1本化し、判定基準の二重化を無くす
import type { Employee, Seat, Team } from '@/types'

// employeeId が非null かつ employeeById に実在する座席だけを「着席」とみなす。
// 表示・集計だけでなく編集系の着席判定(削除確認・空席タップ)からも呼ばれる公開関数。
// 空席の null は社員の鍵に無いので has がそのまま false を返す。null を渡せるよう鍵の型を広げて引く
export const isOccupiedSeat = (seat: Seat, employeeById: Map<string, Employee>): boolean =>
  (employeeById as ReadonlyMap<string | null, Employee>).has(seat.employeeId)

// 単一チーム分の実在着席数。呼び出し側で対象チームの座席へ絞り込んだ配列を渡す
// (TeamOverlay ヘッダーの「N名」用)
export const countOccupiedSeats = (seats: Seat[], employeeById: Map<string, Employee>): number =>
  seats.filter(seat => isOccupiedSeat(seat, employeeById)).length

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
    // teams に無いチームは鍵が無く undefined になる
    const count = counts.get(seat.teamId)
    if (count === undefined) continue
    if (!isOccupiedSeat(seat, employeeById)) continue
    counts.set(seat.teamId, count + 1)
  }
  return counts
}
