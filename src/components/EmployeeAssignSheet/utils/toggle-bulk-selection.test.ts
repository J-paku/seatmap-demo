import { describe, it, expect } from 'vitest'
import type { Employee } from '@/types'
import type { AssignCandidate } from './group-assign-candidates'
import { toggleAllSelected, toggleSelectedId } from './toggle-bulk-selection'

const member = (id: string): AssignCandidate => {
  const employee: Employee = { id, name: id, nameKana: id, teamId: 't1', team: 'あ部' }
  return { employee, seatedAt: null, needsConfirm: false }
}

const sorted = (set: Set<string>) => [...set].sort()

describe('toggleSelectedId', () => {
  it('選ばれていない社員を足す', () => {
    expect(sorted(toggleSelectedId(new Set(['a']), 'b'))).toEqual(['a', 'b'])
  })

  it('選ばれている社員を外す', () => {
    expect(sorted(toggleSelectedId(new Set(['a', 'b']), 'b'))).toEqual(['a'])
  })

  it('前の集合は変えず、別の集合を返す', () => {
    const prev = new Set(['a'])
    const next = toggleSelectedId(prev, 'a')
    expect(next).not.toBe(prev)
    expect(sorted(prev)).toEqual(['a'])
  })
})

describe('toggleAllSelected', () => {
  const members = [member('a'), member('b')]

  it('誰も選ばれていなければ全員を選ぶ', () => {
    expect(sorted(toggleAllSelected(new Set(), members))).toEqual(['a', 'b'])
  })

  it('一部だけ選ばれていれば全員を選ぶ', () => {
    expect(sorted(toggleAllSelected(new Set(['a']), members))).toEqual(['a', 'b'])
  })

  it('全員が選ばれていれば全部外す', () => {
    expect(sorted(toggleAllSelected(new Set(['a', 'b']), members))).toEqual([])
  })

  it('対象の外の社員が選ばれていても、対象の全員が選ばれていれば全部外す', () => {
    expect(sorted(toggleAllSelected(new Set(['a', 'b', 'x']), members))).toEqual([])
  })

  it('対象が0人なら、前に何が選ばれていても空にする', () => {
    expect(sorted(toggleAllSelected(new Set(['x']), []))).toEqual([])
  })

  it('前の集合は変えない', () => {
    const prev = new Set(['a'])
    toggleAllSelected(prev, members)
    expect(sorted(prev)).toEqual(['a'])
  })
})
