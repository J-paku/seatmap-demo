import { isOccupiedSeat } from '@/utils/seat-occupancy'
import type { Employee, Seat } from '@/types'

// 1席だけ選んでいて、その席に実在社員が着席しているか。未選択・2席以上・見つからない席は false
export const isSingleSeatOccupied = (
  seatIds: string[],
  seats: Seat[],
  employeeById: Map<string, Employee>
): boolean => {
  if (seatIds.length !== 1) return false
  const seat = seats.find(s => s.id === seatIds[0])
  return seat ? isOccupiedSeat(seat, employeeById) : false
}
