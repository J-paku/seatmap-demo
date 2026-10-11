// 配属シートの対象席から読む判定(シートを開けるか・空席か・誰が座っているか)
import type { Employee, Seat } from '@/types'
import { isOccupiedSeat } from '@/utils/seat-occupancy'

// 対象席が無い間は開くよう頼まれてもシートを出さない
export const canOpenSheet = (isOpen: boolean, seat: Seat | null): boolean => isOpen && seat !== null

// §06-4/§07-4: 「対象が空席か」の判定は着席判定の唯一の正本(utils/seat-occupancy)を通す
export const checkTargetSeatEmpty = (
  seat: Seat | null,
  employeeById: Map<string, Employee>
): boolean => seat !== null && !isOccupiedSeat(seat, employeeById)

export const findSeatOccupant = (
  seat: Seat | null,
  employeeById: Map<string, Employee>
): Employee | null => (seat?.employeeId ? (employeeById.get(seat.employeeId) ?? null) : null)
