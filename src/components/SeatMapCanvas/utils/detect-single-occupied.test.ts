import { describe, it, expect } from 'vitest'
import { isSingleSeatOccupied } from './detect-single-occupied'
import type { Employee, Seat } from '@/types'

const employee = (id: string): Employee => ({
  id,
  name: `社員${id}`,
  nameKana: 'シャイン',
  teamId: 'team-a',
  team: 'チームA',
})

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

const employeeById = new Map([['e1', employee('e1')]])
// 着席の席を先頭に置く。探す席を取り違えると先頭の着席を拾って true になる
const seats = [seat('s-occupied', 'e1'), seat('s-empty', null)]

describe('isSingleSeatOccupied', () => {
  it('1席だけ選んでいて、その席に実在社員が着席していれば true', () => {
    expect(isSingleSeatOccupied(['s-occupied'], seats, employeeById)).toBe(true)
  })

  it('1席だけ選んでいても空席なら false', () => {
    expect(isSingleSeatOccupied(['s-empty'], seats, employeeById)).toBe(false)
  })

  it('2席以上を選んでいれば、先頭が着席でも false', () => {
    expect(isSingleSeatOccupied(['s-occupied', 's-empty'], seats, employeeById)).toBe(false)
  })

  it('何も選んでいなければ false', () => {
    expect(isSingleSeatOccupied([], seats, employeeById)).toBe(false)
  })

  it('選んだ席がレイアウトに無ければ false', () => {
    expect(isSingleSeatOccupied(['s-missing'], seats, employeeById)).toBe(false)
  })
})
