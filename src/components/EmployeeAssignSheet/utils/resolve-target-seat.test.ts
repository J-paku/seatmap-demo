import { describe, it, expect } from 'vitest'
import type { Employee, Seat } from '@/types'
import { canOpenSheet, checkTargetSeatEmpty, findSeatOccupant } from './resolve-target-seat'

const seat = (employeeId: string | null): Seat => ({
  id: 's1',
  teamId: 't1',
  x: 0,
  y: 0,
  width: 1,
  height: 1,
  rotation: 0,
  employeeId,
})

const sato: Employee = { id: 'e1', name: '佐藤', nameKana: 'さとう', teamId: 't1', team: 'あ部' }
const employeeById = new Map([[sato.id, sato]])

describe('canOpenSheet', () => {
  it('開くよう頼まれていて対象席がある時だけ開く', () => {
    expect(canOpenSheet(true, seat(null))).toBe(true)
  })

  it('開くよう頼まれていなければ対象席があっても開かない', () => {
    expect(canOpenSheet(false, seat(null))).toBe(false)
  })

  it('対象席が無ければ開くよう頼まれても開かない', () => {
    expect(canOpenSheet(true, null)).toBe(false)
  })
})

describe('checkTargetSeatEmpty', () => {
  it('誰も座っていない席は空席', () => {
    expect(checkTargetSeatEmpty(seat(null), employeeById)).toBe(true)
  })

  it('実在する社員が座っている席は空席ではない', () => {
    expect(checkTargetSeatEmpty(seat('e1'), employeeById)).toBe(false)
  })

  it('実在しない社員IDが残っている席は空席とみなす', () => {
    expect(checkTargetSeatEmpty(seat('ghost'), employeeById)).toBe(true)
  })

  it('対象席が無ければ空席ではない', () => {
    expect(checkTargetSeatEmpty(null, employeeById)).toBe(false)
  })
})

describe('findSeatOccupant', () => {
  it('座っている社員を引いて返す', () => {
    expect(findSeatOccupant(seat('e1'), employeeById)).toBe(sato)
  })

  it('誰も座っていない席は null', () => {
    expect(findSeatOccupant(seat(null), employeeById)).toBeNull()
  })

  it('実在しない社員IDが残っている席は undefined ではなく null', () => {
    expect(findSeatOccupant(seat('ghost'), employeeById)).toBeNull()
  })

  it('対象席が無ければ null', () => {
    expect(findSeatOccupant(null, employeeById)).toBeNull()
  })
})
