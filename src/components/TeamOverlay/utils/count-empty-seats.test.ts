import { describe, expect, it } from 'vitest'
import type { Seat } from '@/types'
import { countEmptySeats } from './count-empty-seats'

const seat = (id: string): Seat => ({
  id,
  teamId: 't1',
  x: 0,
  y: 0,
  width: 105,
  height: 75,
  rotation: 0,
  employeeId: null,
})

describe('countEmptySeats', () => {
  it('チームの座席数から在席数を引いた数', () => {
    expect(countEmptySeats([seat('a'), seat('b'), seat('c')], 2)).toBe(1)
  })

  it('全席が埋まっていれば 0', () => {
    expect(countEmptySeats([seat('a'), seat('b')], 2)).toBe(0)
  })
})
