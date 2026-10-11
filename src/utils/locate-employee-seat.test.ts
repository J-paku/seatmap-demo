import { describe, expect, it } from 'vitest'
import { buildSeatByEmployee } from './locate-employee-seat'
import type { Seat } from '@/types'

const seat = (id: string, employeeId: string | null): Seat => ({
  id,
  teamId: 'team-a',
  x: 0,
  y: 0,
  width: 105,
  height: 75,
  rotation: 0,
  employeeId,
})

describe('buildSeatByEmployee', () => {
  it('座席が無ければ空', () => {
    expect(buildSeatByEmployee([]).size).toBe(0)
  })

  it('社員ごとに座っている席を引ける', () => {
    const a = seat('seat-1', 'emp-a')
    const b = seat('seat-2', 'emp-b')
    const map = buildSeatByEmployee([a, b])
    expect([...map.entries()]).toEqual([
      ['emp-a', a],
      ['emp-b', b],
    ])
  })

  it('空席は鍵にしない', () => {
    const occupied = seat('seat-2', 'emp-a')
    const map = buildSeatByEmployee([seat('seat-1', null), occupied, seat('seat-3', null)])
    expect([...map.entries()]).toEqual([['emp-a', occupied]])
  })

  it('同じ社員が2席に居れば、配列の先にある席を現在席とする', () => {
    const first = seat('seat-1', 'emp-a')
    const map = buildSeatByEmployee([first, seat('seat-2', 'emp-a')])
    expect([...map.entries()]).toEqual([['emp-a', first]])
  })
})
