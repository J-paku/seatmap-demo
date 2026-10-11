import { describe, it, expect } from 'vitest'
import type { Employee, Seat } from '@/types'
import {
  buildDepartmentGroups,
  filterCandidateEmployees,
  sortCandidates,
  type AssignCandidate,
} from './group-assign-candidates'

const employee = (id: string, team: string, name = id): Employee => ({
  id,
  name,
  nameKana: name,
  teamId: 't1',
  team,
})

const candidate = (person: Employee, seatedAt: string | null = null): AssignCandidate => ({
  employee: person,
  seatedAt,
  needsConfirm: false,
})

const ids = (list: AssignCandidate[]) => list.map(item => item.employee.id)

describe('filterCandidateEmployees', () => {
  const free = employee('free', 'あ部')
  const seated = employee('seated', 'い部')
  const seat: Seat = {
    id: 's1',
    teamId: 't1',
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    rotation: 0,
    employeeId: 'seated',
  }
  const seatByEmployee = new Map([['seated', seat]])

  it('空・空白だけのクエリは未配属の社員だけを返す', () => {
    expect(filterCandidateEmployees([free, seated], '', seatByEmployee)).toEqual([free])
    expect(filterCandidateEmployees([free, seated], '  ', seatByEmployee)).toEqual([free])
  })

  it('検索中は配属済みでも一致する社員を返し、一致しない社員は外す', () => {
    expect(filterCandidateEmployees([free, seated], 'い部', seatByEmployee)).toEqual([seated])
  })
})

describe('sortCandidates', () => {
  it('未配属をチーム名より優先して配属済みより先に並べる(渡す順に依らない)', () => {
    const seated = candidate(employee('seated', 'あ部'), 's1')
    const free = candidate(employee('free', 'い部'))
    expect(ids(sortCandidates([seated, free]))).toEqual(['free', 'seated'])
    expect(ids(sortCandidates([free, seated]))).toEqual(['free', 'seated'])
  })

  it('配属の有無が同じならチーム名の五十音順に並べる', () => {
    const later = candidate(employee('later', 'い部', 'あ'))
    const earlier = candidate(employee('earlier', 'あ部', 'い'))
    expect(ids(sortCandidates([later, earlier]))).toEqual(['earlier', 'later'])
  })

  it('チームも同じなら名前の五十音順に並べる', () => {
    const later = candidate(employee('a', 'あ部', 'い'))
    const earlier = candidate(employee('b', 'あ部', 'あ'))
    expect(ids(sortCandidates([later, earlier]))).toEqual(['b', 'a'])
  })

  it('名前も同じなら ID 順に並べ、元の配列は変えない', () => {
    const input = [candidate(employee('e2', 'あ部', 'あ')), candidate(employee('e1', 'あ部', 'あ'))]
    expect(ids(sortCandidates(input))).toEqual(['e1', 'e2'])
    expect(ids(input)).toEqual(['e2', 'e1'])
  })
})

describe('buildDepartmentGroups', () => {
  const u1 = candidate(employee('u1', 'う部'))
  const a1 = candidate(employee('a1', 'あ部'))
  const u2 = candidate(employee('u2', 'う部'))
  const i1 = candidate(employee('i1', 'い部'))
  const summary = (groups: ReturnType<typeof buildDepartmentGroups>) =>
    groups.map(group => [group.department, ids(group.candidates)])

  it('所属で束ねて部署名の五十音順に並べ、部署内は渡された順を保つ', () => {
    expect(summary(buildDepartmentGroups([u1, a1, u2], new Set(), null))).toEqual([
      ['あ部', ['a1']],
      ['う部', ['u1', 'u2']],
    ])
  })

  it('お気に入りの部署を先へ繰り上げる', () => {
    expect(summary(buildDepartmentGroups([u1, a1], new Set(['う部']), null))).toEqual([
      ['う部', ['u1']],
      ['あ部', ['a1']],
    ])
  })

  it('現在のチームはお気に入りより前の絶対先頭に置く', () => {
    const groups = buildDepartmentGroups([u1, a1, i1], new Set(['う部']), 'い部')
    expect(summary(groups)).toEqual([
      ['い部', ['i1']],
      ['う部', ['u1']],
      ['あ部', ['a1']],
    ])
  })

  it('現在のチームが候補に無ければ先頭に足さない', () => {
    expect(summary(buildDepartmentGroups([u1, a1], new Set(), 'え部'))).toEqual([
      ['あ部', ['a1']],
      ['う部', ['u1']],
    ])
  })
})
