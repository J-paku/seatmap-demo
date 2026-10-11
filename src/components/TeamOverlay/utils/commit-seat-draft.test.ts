import { describe, expect, it } from 'vitest'
import { EMPTY_COMMIT_RESULT, normalizeDraftIntoLayout } from './commit-seat-draft'
import type { SeatDraftState } from '../hooks/use-seat-draft-state'
import type { SeatGridDraft } from '@/utils/layout/seat-grid-draft'
import type { Seat, SeatLayout, Team } from '@/types'

const TEAM_ID = 'team-a'

const team = (id: string, idPrefix: string): Team => ({
  id,
  idPrefix,
  name: id,
  color: '#336699',
  area: { x: 0, y: 0, w: 600, h: 400 },
})

const seat = (id: string, overrides: Partial<Seat> = {}): Seat => ({
  id,
  teamId: TEAM_ID,
  x: 0,
  y: 0,
  width: 105,
  height: 75,
  rotation: 0,
  employeeId: null,
  ...overrides,
})

const layoutOf = (seats: Seat[]): SeatLayout => ({
  floorId: 'f1',
  floorName: 'Floor 1',
  viewBox: { width: 1600, height: 1200 },
  seats,
  teams: [team(TEAM_ID, 'A'), team('team-b', 'B')],
  facilities: [],
  furniture: [],
})

// セル幅 100・行の高さ 80、左上の原点は (10, 20)
const gridOf = (cells: (string | null)[][]): SeatGridDraft => ({
  cells,
  originX: 10,
  originY: 20,
  colPitch: 100,
  rowPitch: 80,
})

const EMPTY_GRID = gridOf([])

// 正規化が読むのは差分の容れ物だけ。操作の口は呼ばれないので何もしない形で埋める
const draftOf = (overrides: Partial<SeatDraftState> = {}): SeatDraftState => ({
  assignmentsOverride: new Map(),
  addedSeats: [],
  removedSeatIds: new Set(),
  rotationOverrides: new Map(),
  moveOrigins: new Map(),
  movedSeatIds: new Set(),
  freeAddressOverride: null,
  changeCount: 0,
  resolveEffectiveEmployeeId: () => null,
  addSeat: added => ({ ...added, id: 'unused' }),
  removeSeat: () => {},
  assignEmployee: () => {},
  rotateSeat: () => {},
  resolveFreeAddressEnabled: saved => saved,
  toggleFreeAddress: () => {},
  syncSeatSources: () => {},
  recordMoveOrigin: () => {},
  syncMovedSeatIds: () => {},
  clearDraft: () => {},
  ...overrides,
})

type SeatRow = [id: string, x: number, y: number, employeeId: string | null, rotation: number]

const rowsOf = (layout: SeatLayout): SeatRow[] =>
  layout.seats.map((s): SeatRow => [s.id, s.x, s.y, s.employeeId, s.rotation])

describe('保存まわりの値', () => {
  it('保存しなかったときの結果は、畳んだ社員が0人', () => {
    expect(EMPTY_COMMIT_RESULT).toEqual({ dedupedEmployeeIds: [] })
  })
})

describe('normalizeDraftIntoLayout', () => {
  it('反映するものが何も無ければ、渡したレイアウトをそのまま返す', () => {
    const layout = layoutOf([seat('A-001', { employeeId: 'e1' })])
    // グリッドへ置いていない下書き席は、回転や社員を持っていても何も反映しない
    const draft = draftOf({
      addedSeats: [seat('seat-draft-1', { rotation: 90, employeeId: 'e9' })],
    })
    const result = normalizeDraftIntoLayout(layout, TEAM_ID, EMPTY_GRID, draft)
    expect(result.layout).toBe(layout)
    expect(result.dedupedEmployeeIds).toEqual([])
  })

  it('既存の席の座標をグリッドのセル位置へ合わせる', () => {
    const layout = layoutOf([seat('A-001', { x: 5, y: 7 }), seat('A-002', { x: 300, y: 7 })])
    const grid = gridOf([
      ['A-001', null, 'A-002'],
      [null, null, null],
    ])
    const result = normalizeDraftIntoLayout(layout, TEAM_ID, grid, draftOf())
    expect(rowsOf(result.layout)).toEqual([
      ['A-001', 10, 20, null, 0],
      ['A-002', 210, 20, null, 0],
    ])
  })

  it('削除した席はレイアウトから除く', () => {
    const layout = layoutOf([seat('A-001'), seat('A-002')])
    const grid = gridOf([['A-001', 'A-002']])
    const draft = draftOf({ removedSeatIds: new Set(['A-002']) })
    const result = normalizeDraftIntoLayout(layout, TEAM_ID, grid, draft)
    expect(result.layout.seats.map(s => s.id)).toEqual(['A-001'])
  })

  it('削除対象の席はグリッドに残っていても保存しない', () => {
    const layout = layoutOf([seat('A-001')])
    const grid = gridOf([['A-001', 'seat-draft-1']])
    const draft = draftOf({
      addedSeats: [seat('seat-draft-1')],
      removedSeatIds: new Set(['seat-draft-1']),
    })
    const result = normalizeDraftIntoLayout(layout, TEAM_ID, grid, draft)
    expect(result.layout.seats.map(s => s.id)).toEqual(['A-001'])
  })

  it('下書き追加席は、既存の最大連番+1の確定 id でグリッドの位置へ置く', () => {
    const layout = layoutOf([seat('A-001'), seat('A-003')])
    const grid = gridOf([
      ['A-001', 'A-003'],
      [null, 'seat-draft-1'],
    ])
    const draft = draftOf({ addedSeats: [seat('seat-draft-1')] })
    const result = normalizeDraftIntoLayout(layout, TEAM_ID, grid, draft)
    expect(rowsOf(result.layout)).toEqual([
      ['A-001', 10, 20, null, 0],
      ['A-003', 110, 20, null, 0],
      ['A-004', 110, 100, null, 0],
    ])
  })

  it('グリッドへ置いていない下書き追加席は保存しない', () => {
    const layout = layoutOf([seat('A-001')])
    const grid = gridOf([['A-001', 'seat-draft-2']])
    const draft = draftOf({
      addedSeats: [seat('seat-draft-1', { employeeId: 'e1' }), seat('seat-draft-2')],
    })
    const result = normalizeDraftIntoLayout(layout, TEAM_ID, grid, draft)
    expect(rowsOf(result.layout)).toEqual([
      ['A-001', 10, 20, null, 0],
      ['A-002', 110, 20, null, 0],
    ])
  })

  it('下書き追加席は、同じ id の既存席があっても既存席として動かさない', () => {
    const layout = layoutOf([seat('A-001', { x: 5, y: 7 })])
    const grid = gridOf([[null, 'A-001']])
    const draft = draftOf({ addedSeats: [seat('A-001')] })
    const result = normalizeDraftIntoLayout(layout, TEAM_ID, grid, draft)
    expect(rowsOf(result.layout)).toEqual([
      ['A-001', 5, 7, null, 0],
      ['A-002', 110, 20, null, 0],
    ])
  })

  it('席を追加できなかった下書き席(チームが無い)の社員は、どの席にも配属しない', () => {
    const layout = layoutOf([seat('A-001')])
    const grid = gridOf([['seat-draft-1']])
    const draft = draftOf({ addedSeats: [seat('seat-draft-1', { employeeId: 'e7' })] })
    const result = normalizeDraftIntoLayout(layout, 'team-missing', grid, draft)
    expect(rowsOf(result.layout)).toEqual([['A-001', 0, 0, null, 0]])
  })

  it('既存席の割当の差分を反映し、空文字は空席にする', () => {
    const layout = layoutOf([seat('A-001', { employeeId: 'e1' }), seat('A-002')])
    const draft = draftOf({
      assignmentsOverride: new Map([
        ['A-001', ''],
        ['A-002', 'e2'],
      ]),
    })
    const result = normalizeDraftIntoLayout(layout, TEAM_ID, EMPTY_GRID, draft)
    expect(result.layout.seats.map(s => s.employeeId)).toEqual([null, 'e2'])
  })

  it('下書き追加席には、下書き自身が持つ社員を配属する', () => {
    const layout = layoutOf([])
    const grid = gridOf([['seat-draft-1', 'seat-draft-2']])
    const draft = draftOf({
      addedSeats: [seat('seat-draft-1', { employeeId: 'e5' }), seat('seat-draft-2')],
    })
    const result = normalizeDraftIntoLayout(layout, TEAM_ID, grid, draft)
    expect(rowsOf(result.layout)).toEqual([
      ['A-001', 10, 20, 'e5', 0],
      ['A-002', 110, 20, null, 0],
    ])
  })

  it('社員 id が空文字の下書き追加席には配属しない', () => {
    const layout = layoutOf([])
    const grid = gridOf([['seat-draft-1']])
    const draft = draftOf({ addedSeats: [seat('seat-draft-1', { employeeId: '' })] })
    const result = normalizeDraftIntoLayout(layout, TEAM_ID, grid, draft)
    expect(result.layout.seats.map(s => s.employeeId)).toEqual([null])
  })

  it('回転の差分を既存席と下書き追加席の両方へ反映する', () => {
    const layout = layoutOf([seat('A-001'), seat('A-002')])
    const grid = gridOf([['A-001', 'A-002', 'seat-draft-1', 'seat-draft-2']])
    const draft = draftOf({
      rotationOverrides: new Map<string, Seat['rotation']>([['A-001', 90]]),
      addedSeats: [seat('seat-draft-1', { rotation: 180 }), seat('seat-draft-2')],
    })
    const result = normalizeDraftIntoLayout(layout, TEAM_ID, grid, draft)
    expect(result.layout.seats.map(s => [s.id, s.rotation])).toEqual([
      ['A-001', 90],
      ['A-002', 0],
      ['A-003', 180],
      ['A-004', 0],
    ])
  })

  it('1人が複数席に残っていたら最後の席だけ残して他を空席にし、畳んだ社員を1回ずつ返す', () => {
    const layout = layoutOf([
      seat('A-001', { employeeId: 'e1' }),
      seat('A-002', { employeeId: 'e1' }),
      seat('A-003', { employeeId: 'e1' }),
      seat('A-004', { employeeId: 'e2' }),
      seat('A-005'),
      seat('A-006'),
    ])
    const result = normalizeDraftIntoLayout(layout, TEAM_ID, EMPTY_GRID, draftOf())
    expect(result.layout.seats.map(s => s.employeeId)).toEqual([null, null, 'e1', 'e2', null, null])
    expect(result.dedupedEmployeeIds).toEqual(['e1'])
  })

  it('フリーアドレス設定の差分は対象のチームにだけ反映する', () => {
    const layout = layoutOf([])
    const turnOn = normalizeDraftIntoLayout(
      layout,
      TEAM_ID,
      EMPTY_GRID,
      draftOf({ freeAddressOverride: true })
    )
    expect(turnOn.layout.teams.map(t => [t.id, t.freeAddressEnabled])).toEqual([
      [TEAM_ID, true],
      ['team-b', undefined],
    ])
    expect(turnOn.layout.teams[1]).toBe(layout.teams[1])

    const turnOff = normalizeDraftIntoLayout(
      layout,
      TEAM_ID,
      EMPTY_GRID,
      draftOf({ freeAddressOverride: false })
    )
    expect(turnOff.layout.teams[0].freeAddressEnabled).toBe(false)
  })
})
