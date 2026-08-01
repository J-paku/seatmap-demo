// 原文 seatUtils.ts のうち、移植対象UIが実際に呼ぶ createVirtualSeat だけを持つ。
// 原文の Seat は employee を埋め込み status を持つが、デモの Seat は employeeId 参照型なので
// §4 の指示どおりデモ側のシグネチャへ合わせる。
// 取り込まなかった createEmptySeat / findEmptyPosition / buildEmployeeSeatMap は
// 付録内に定義があるだけで呼び出し側が無く、取り込むには Seat へ status/isPending/employee を
// 足す必要があり、キャンバスと編集モード全体に波及するため見送る。
import type { Employee, Seat } from '@/types'

// 座席未割当の社員を詳細パネルに表示するための仮想 Seat
export function createVirtualSeat(employee: Employee): Seat {
  return {
    id: '',
    teamId: employee.teamId,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    employeeId: employee.id,
  }
}
