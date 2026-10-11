import { describe, expect, it } from 'vitest'
import { buildEditingSeatGrid } from './build-editing-grid'
import type { SeatGridDraft } from '@/utils/layout/seat-grid-draft'
import type { Seat } from '@/types'

const seat = (id: string, overrides: Partial<Seat> = {}): Seat => ({
  id,
  teamId: 'team-01',
  x: 0,
  y: 0,
  width: 100,
  height: 80,
  rotation: 0,
  employeeId: null,
  ...overrides,
})

const gridOf = (cells: (string | null)[][]): SeatGridDraft => ({
  cells,
  originX: 0,
  originY: 0,
  colPitch: 120,
  rowPitch: 100,
})

// 割当の上書きが無い時の解決口。保存済みの社員idをそのまま返す
const keepSaved = (_seatId: string, savedEmployeeId: string | null): string | null =>
  savedEmployeeId

const noRotation = new Map<string, Seat['rotation']>()

describe('buildEditingSeatGrid', () => {
  it('セルが1つも無ければ 0 行 0 列で、席も空セルも無い', () => {
    expect(buildEditingSeatGrid(gridOf([]), [], [], new Set(), keepSaved, noRotation)).toEqual({
      positionedSeats: [],
      seatByGridCell: new Map(),
      rows: 0,
      cols: 0,
      emptyCells: [],
    })
  })

  it('セルの行列をそのまま行・列にし、null のセルは空セルへ積む', () => {
    const a = seat('a', { employeeId: 'emp-a' })
    const b = seat('b')
    const result = buildEditingSeatGrid(
      gridOf([
        ['a', null, null],
        [null, 'b', null],
      ]),
      [a, b],
      [],
      new Set(),
      keepSaved,
      noRotation
    )
    expect(result).toEqual({
      positionedSeats: [
        { seat: a, row: 0, col: 0 },
        { seat: b, row: 1, col: 1 },
      ],
      seatByGridCell: new Map([
        ['0:0', a],
        ['1:1', b],
      ]),
      rows: 2,
      cols: 3,
      emptyCells: [
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 1, col: 0 },
        { row: 1, col: 2 },
      ],
    })
  })

  it('空文字の座席idは空セルとして扱い、同じidの席があっても引かない', () => {
    const result = buildEditingSeatGrid(
      gridOf([['']]),
      [seat('')],
      [],
      new Set(),
      keepSaved,
      noRotation
    )
    expect(result.positionedSeats).toEqual([])
    expect(result.emptyCells).toEqual([{ row: 0, col: 0 }])
  })

  it('削除差分にある席と、どこにも無い席は空セルになる', () => {
    const result = buildEditingSeatGrid(
      gridOf([['gone', 'missing', 'kept']]),
      [seat('gone'), seat('kept')],
      [],
      new Set(['gone']),
      keepSaved,
      noRotation
    )
    expect(result.positionedSeats.map(p => p.seat.id)).toEqual(['kept'])
    expect(result.emptyCells).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ])
  })

  it('同じidなら下書き追加席を既存席より優先し、それぞれidが一致する席を引く', () => {
    const added1 = seat('x', { teamId: 'added' })
    const added2 = seat('y', { teamId: 'added' })
    const saved = seat('y', { teamId: 'saved' })
    const savedOnly = seat('z', { teamId: 'saved' })
    const result = buildEditingSeatGrid(
      gridOf([['y', 'z', 'x']]),
      [seat('w'), saved, savedOnly],
      [added1, added2],
      new Set(),
      keepSaved,
      noRotation
    )
    expect(result.positionedSeats.map(p => p.seat)).toEqual([added2, savedOnly, added1])
  })

  it('割当は解決口に席idと保存済みの社員idを渡した結果で上書きする', () => {
    const resolve = (seatId: string, savedEmployeeId: string | null): string | null =>
      seatId === 'a' ? `${savedEmployeeId}-moved` : null
    const result = buildEditingSeatGrid(
      gridOf([['a', 'b']]),
      [seat('a', { employeeId: 'emp-a' }), seat('b', { employeeId: 'emp-b' })],
      [],
      new Set(),
      resolve,
      noRotation
    )
    expect(result.positionedSeats.map(p => p.seat.employeeId)).toEqual(['emp-a-moved', null])
  })

  it('回転は差分があればそれを使い、無ければ元の席の回転を使う', () => {
    const result = buildEditingSeatGrid(
      gridOf([['a', 'b']]),
      [seat('a', { rotation: 90 }), seat('b', { rotation: 180 })],
      [],
      new Set(),
      keepSaved,
      new Map([['a', 270]])
    )
    expect(result.positionedSeats.map(p => p.seat.rotation)).toEqual([270, 180])
  })

  it('元の席は書き換えず、新しい席オブジェクトを返す', () => {
    const original = seat('a', { rotation: 90, employeeId: 'emp-a' })
    const result = buildEditingSeatGrid(
      gridOf([['a']]),
      [original],
      [],
      new Set(),
      () => 'emp-b',
      new Map([['a', 0]])
    )
    expect(result.positionedSeats[0].seat).toEqual({
      ...original,
      rotation: 0,
      employeeId: 'emp-b',
    })
    expect(original).toEqual(seat('a', { rotation: 90, employeeId: 'emp-a' }))
  })
})
