import { describe, it, expect, vi } from 'vitest'
import type { Employee } from '@/types'
import type { AssignCandidate } from './group-assign-candidates'
import { selectCandidate, submitBulkAssign } from './route-assign-choice'

const candidate = (needsConfirm: boolean): AssignCandidate => {
  const employee: Employee = {
    id: 'e1',
    name: '佐藤',
    nameKana: 'さとう',
    teamId: 't1',
    team: 'あ部',
  }
  return { employee, seatedAt: null, needsConfirm }
}

describe('selectCandidate', () => {
  it('確認が要る候補は、確認の口があればそちらへ社員IDを渡す', () => {
    const onSelect = vi.fn()
    const onSelectRequiringConfirm = vi.fn()
    selectCandidate(candidate(true), onSelect, onSelectRequiringConfirm)
    expect(onSelectRequiringConfirm).toHaveBeenCalledExactlyOnceWith('e1')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('確認が要る候補でも、確認の口が無ければ直接選ぶ', () => {
    const onSelect = vi.fn()
    selectCandidate(candidate(true), onSelect, undefined)
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('e1')
  })

  it('確認が要らない候補は、確認の口があっても直接選ぶ', () => {
    const onSelect = vi.fn()
    const onSelectRequiringConfirm = vi.fn()
    selectCandidate(candidate(false), onSelect, onSelectRequiringConfirm)
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('e1')
    expect(onSelectRequiringConfirm).not.toHaveBeenCalled()
  })
})

describe('submitBulkAssign', () => {
  it('選んだ社員IDを受け取る口があれば、選んだ順の配列で渡し、部署全員の口は呼ばない', () => {
    const onBulkAssignSelected = vi.fn()
    const onBulkAssign = vi.fn()
    submitBulkAssign(new Set(['b', 'a']), onBulkAssignSelected, onBulkAssign)
    expect(onBulkAssignSelected).toHaveBeenCalledExactlyOnceWith(['b', 'a'])
    expect(onBulkAssign).not.toHaveBeenCalled()
  })

  it('選んだ社員IDを受け取る口が無ければ、部署全員の口を呼ぶ', () => {
    const onBulkAssign = vi.fn()
    submitBulkAssign(new Set(['a']), undefined, onBulkAssign)
    expect(onBulkAssign).toHaveBeenCalledExactlyOnceWith()
  })

  it('どちらの口も無ければ何もしない', () => {
    expect(() => submitBulkAssign(new Set(['a']), undefined, undefined)).not.toThrow()
  })
})
