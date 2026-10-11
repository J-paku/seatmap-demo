import { describe, expect, it } from 'vitest'
import type { Employee, Seat } from '@/types'
import { buildBulkAssignPlan } from './plan-bulk-assign'

const employee = (id: string, teamId: string, team: string): Employee => ({
  id,
  name: `社員${id}`,
  nameKana: 'シャイン',
  teamId,
  team,
})

const seat = (id: string, teamId: string, employeeId: string | null): Seat => ({
  id,
  teamId,
  x: 0,
  y: 0,
  width: 105,
  height: 75,
  rotation: 0,
  employeeId,
})

// t1(営業部)へ一括配置する想定。e1 は未配属、e2 は t1 に着席済み、e3 は t1 所属だが t2 の席、
// e4 は t2(開発部)所属で t2 の席、e5 は t2 所属で未配属
const e1 = employee('e1', 't1', '営業部')
const e2 = employee('e2', 't1', '営業部')
const e3 = employee('e3', 't1', '営業部')
const e4 = employee('e4', 't2', '開発部')
const e5 = employee('e5', 't2', '開発部')
const employees = [e1, e2, e3, e4, e5]
const seats = [seat('s-t1', 't1', 'e2'), seat('s-x', 't2', 'e3'), seat('s-t2', 't2', 'e4')]

describe('buildBulkAssignPlan の対象の選び方', () => {
  it('選択が null なら対象チームの社員全員を employees の並び順で対象にする', () => {
    const plan = buildBulkAssignPlan('t1', employees, [], null)

    expect(plan.teamId).toBe('t1')
    expect(plan.targets.map(t => t.employee.id)).toEqual(['e1', 'e2', 'e3'])
  })

  it('選択が配列ならその社員だけを、選択の順ではなく employees の並び順で対象にする', () => {
    const plan = buildBulkAssignPlan('t1', employees, [], ['e5', 'e1', 'e4'])

    expect(plan.targets.map(t => t.employee.id)).toEqual(['e1', 'e4', 'e5'])
  })

  it('選択が空配列なら誰も対象にしない', () => {
    expect(buildBulkAssignPlan('t1', employees, [], []).targets).toEqual([])
  })

  it('既に対象チームの席に座っている社員は外し、他チームの席に座っている社員は元の席を持って残す', () => {
    const plan = buildBulkAssignPlan('t1', employees, seats, ['e1', 'e2', 'e3', 'e4'])

    expect(plan.targets).toEqual([
      { employee: e1, originSeatId: null },
      { employee: e3, originSeatId: 's-x' },
      { employee: e4, originSeatId: 's-t2' },
    ])
  })
})

describe('buildBulkAssignPlan の移動確認', () => {
  it('移動してくる社員が居なければ確認を出さない', () => {
    const plan = buildBulkAssignPlan('t1', employees, seats, ['e1', 'e5'])

    expect(plan.moverCount).toBe(0)
    expect(plan.confirm).toBeNull()
  })

  it('移動してくる社員が居れば人数・本文・名前と部署の一覧・未配属の追記を組み立てる', () => {
    const plan = buildBulkAssignPlan('t1', employees, seats, ['e1', 'e3', 'e4', 'e5'])

    expect(plan.moverCount).toBe(2)
    expect(plan.confirm).toEqual({
      title: '2名をこのチームへ移動しますか？',
      body: '以下の社員は他の座席に配置済みです。複製せず、現在の座席を空けてこのチームへ移動します。',
      moverLabels: ['社員e3 (営業部)', '社員e4 (開発部)'],
      newcomerNote: '未配属の新規2名も併せて配置します。',
    })
  })

  it('移動してくる社員だけなら未配属の追記は null', () => {
    const plan = buildBulkAssignPlan('t1', employees, seats, ['e4'])

    expect(plan.moverCount).toBe(1)
    expect(plan.confirm).toEqual({
      title: '1名をこのチームへ移動しますか？',
      body: '以下の社員は他の座席に配置済みです。複製せず、現在の座席を空けてこのチームへ移動します。',
      moverLabels: ['社員e4 (開発部)'],
      newcomerNote: null,
    })
  })
})
