import { useEmployees, useSeatLayout, useTeams } from '@/lib/mock-loader'
import type { Employee, Team } from '@/types'

type Params = {
  seatId: string | null
  employeeId: string | null
}

type Result = {
  employee: Employee | null
  team: Team | null
  // 座席経路で座席は引けたが誰も座っていない状態
  isVacantSeat: boolean
  // 座席経路なのに座席が引けない状態(呼び出し側は何も描かない)
  isMissingSeat: boolean
}

// 座席経路(seatId)と人物経路(employeeId)の両方から同じ社員カードの描画対象を解決する。
// 座席は種データではなく useSeatLayout の座席を見る — 保存済みレイアウトがある環境で
// 種データを見ると、配属解除した席に旧occupantが出てキャンバス側の表示と食い違う
export const useEmployeeDetailTarget = ({ seatId, employeeId }: Params): Result => {
  const { layout } = useSeatLayout()
  const { data: employees } = useEmployees()
  const { data: teams } = useTeams()
  const seats = layout?.seats

  // 座席経路は座席→社員、人物経路は社員を直接引く
  const seatFromId = seatId ? seats?.find((s) => s.id === seatId) ?? null : null
  const employeeFromSeat = seatFromId?.employeeId
    ? employees?.find((e) => e.id === seatFromId.employeeId) ?? null
    : null
  const employeeFromId = employeeId ? employees?.find((e) => e.id === employeeId) ?? null : null

  const employee = seatId ? employeeFromSeat : employeeFromId
  const team = employee ? teams?.find((t) => t.id === employee.teamId) ?? null : null

  return {
    employee,
    team,
    isVacantSeat: !!seatId && !!seatFromId && !seatFromId.employeeId,
    isMissingSeat: !!seatId && !seatFromId,
  }
}
