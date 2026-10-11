import type { Seat, SeatLayout } from '@/types'

// 社員が座っている席。社員が決まっていない・レイアウト未取得・席を持たない社員は null
export const seatOfEmployee = (
  layout: SeatLayout | undefined,
  employeeId: string | null
): Seat | null =>
  employeeId ? (layout?.seats.find(candidate => candidate.employeeId === employeeId) ?? null) : null
