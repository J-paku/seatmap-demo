import { describe, expect, it } from 'vitest'
import type { Seat } from '@/types'
import { filterTeamSeats } from './filter-team-seats'

const seat = (id: string, teamId: string): Seat => ({
  id,
  teamId,
  x: 0,
  y: 0,
  width: 105,
  height: 75,
  rotation: 0,
  employeeId: null,
})

const seats = [seat('a1', 't1'), seat('b1', 't2'), seat('a2', 't1')]

describe('filterTeamSeats', () => {
  it('開いているチームの座席だけを元の並び順で返す', () => {
    expect(filterTeamSeats(seats, { teamId: 't1' }).map(s => s.id)).toEqual(['a1', 'a2'])
  })

  it('座席の無いチームなら空', () => {
    expect(filterTeamSeats(seats, { teamId: 't9' })).toEqual([])
  })

  it('閉じている(payload が null)間は空', () => {
    expect(filterTeamSeats(seats, null)).toEqual([])
  })
})
