import { describe, it, expect } from 'vitest'
import { seatOfEmployee } from './find-employee-seat'
import type { Seat, SeatLayout } from '@/types'

const seatOf = (id: string, employeeId: string | null): Seat => ({
  id,
  teamId: 'team-1',
  x: 0,
  y: 0,
  width: 105,
  height: 75,
  rotation: 0,
  employeeId,
})

const layoutOf = (seats: Seat[]): SeatLayout => ({
  floorId: 'floor-1',
  floorName: '1F',
  viewBox: { width: 1920, height: 1080 },
  seats,
  teams: [],
  facilities: [],
  furniture: [],
})

// 空席・空文字の社員ID・着席中の席を1つずつ持つ
const LAYOUT = layoutOf([seatOf('dev-001', null), seatOf('dev-002', ''), seatOf('dev-003', 'e1')])

describe('seatOfEmployee', () => {
  it('その社員が座っている席を返す', () => {
    expect(seatOfEmployee(LAYOUT, 'e1')).toBe(LAYOUT.seats[2])
  })

  it('席を持たない社員は null', () => {
    expect(seatOfEmployee(LAYOUT, 'e9')).toBeNull()
  })

  it('社員が決まっていない(null)なら空席を引かずに null', () => {
    expect(seatOfEmployee(LAYOUT, null)).toBeNull()
  })

  it('空文字の社員IDは席を引かずに null', () => {
    expect(seatOfEmployee(LAYOUT, '')).toBeNull()
  })

  it('レイアウト未取得なら null', () => {
    expect(seatOfEmployee(undefined, 'e1')).toBeNull()
  })
})
