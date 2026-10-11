import { describe, it, expect } from 'vitest'
import { isOccupiedSeat, countOccupiedSeats, countOccupiedSeatsByTeam } from './seat-occupancy'
import type { Employee, Seat, Team } from '@/types'

const employee = (id: string): Employee => ({ id, name: `社員${id}`, nameKana: 'シャイン', teamId: 'team-a', team: 'チームA' })

const seat = (over: Partial<Seat>): Seat => ({
  id: 'seat-1',
  teamId: 'team-a',
  x: 0,
  y: 0,
  width: 105,
  height: 75,
  rotation: 0,
  employeeId: null,
  ...over,
})

const team = (id: string): Team => ({
  id,
  idPrefix: id,
  name: `チーム${id}`,
  color: '#123456',
  area: { x: 0, y: 0, w: 100, h: 100 },
})

describe('isOccupiedSeat', () => {
  it('employeeIdがnullなら未着席', () => {
    const employeeById = new Map([['e1', employee('e1')]])
    expect(isOccupiedSeat(seat({ employeeId: null }), employeeById)).toBe(false)
  })

  it('employeeIdが実在する社員を指していれば着席', () => {
    const employeeById = new Map([['e1', employee('e1')]])
    expect(isOccupiedSeat(seat({ employeeId: 'e1' }), employeeById)).toBe(true)
  })

  it('employeeIdがemployeeByIdに存在しない(実在しない社員=ダングリング参照)なら未着席', () => {
    const employeeById = new Map([['e1', employee('e1')]])
    expect(isOccupiedSeat(seat({ employeeId: 'ghost' }), employeeById)).toBe(false)
  })
})

describe('countOccupiedSeats', () => {
  it('null・ダングリング参照を除いた実在着席数だけを数える', () => {
    const employeeById = new Map([
      ['e1', employee('e1')],
      ['e2', employee('e2')],
    ])
    const seats = [
      seat({ id: 's1', employeeId: 'e1' }),
      seat({ id: 's2', employeeId: null }),
      seat({ id: 's3', employeeId: 'e2' }),
      seat({ id: 's4', employeeId: 'ghost' }),
    ]
    expect(countOccupiedSeats(seats, employeeById)).toBe(2)
  })

  it('空配列なら0', () => {
    expect(countOccupiedSeats([], new Map())).toBe(0)
  })
})

describe('countOccupiedSeatsByTeam', () => {
  it('teamsに含まれるチームは座席が無くても0で埋める', () => {
    const employeeById = new Map<string, Employee>()
    const counts = countOccupiedSeatsByTeam([], employeeById, [team('team-a'), team('team-b')])
    expect(counts.get('team-a')).toBe(0)
    expect(counts.get('team-b')).toBe(0)
    expect(counts.size).toBe(2)
  })

  it('teamsに無いチームIDの座席は数えず、Mapのキーにも追加しない', () => {
    const employeeById = new Map([['e1', employee('e1')]])
    const seats = [seat({ id: 's1', teamId: 'team-x', employeeId: 'e1' })]
    const counts = countOccupiedSeatsByTeam(seats, employeeById, [team('team-a')])
    expect(counts.has('team-x')).toBe(false)
    expect(counts.get('team-a')).toBe(0)
  })

  it('同一チームの複数座席の着席数を積算する', () => {
    const employeeById = new Map([
      ['e1', employee('e1')],
      ['e2', employee('e2')],
    ])
    const seats = [
      seat({ id: 's1', teamId: 'team-a', employeeId: 'e1' }),
      seat({ id: 's2', teamId: 'team-a', employeeId: 'e2' }),
      seat({ id: 's3', teamId: 'team-a', employeeId: null }),
      seat({ id: 's4', teamId: 'team-a', employeeId: 'ghost' }),
    ]
    const counts = countOccupiedSeatsByTeam(seats, employeeById, [team('team-a')])
    expect(counts.get('team-a')).toBe(2)
  })

  it('複数チームをそれぞれ独立して集計する', () => {
    const employeeById = new Map([
      ['e1', employee('e1')],
      ['e2', employee('e2')],
    ])
    const seats = [
      seat({ id: 's1', teamId: 'team-a', employeeId: 'e1' }),
      seat({ id: 's2', teamId: 'team-b', employeeId: 'e2' }),
      seat({ id: 's3', teamId: 'team-b', employeeId: null }),
    ]
    const counts = countOccupiedSeatsByTeam(seats, employeeById, [team('team-a'), team('team-b')])
    expect(counts.get('team-a')).toBe(1)
    expect(counts.get('team-b')).toBe(1)
  })
})
