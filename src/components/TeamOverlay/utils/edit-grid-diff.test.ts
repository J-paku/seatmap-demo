import { describe, expect, it } from 'vitest'
import { computeMovedSeatIds, isSameSeatGridDraft } from './edit-grid-diff'
import type { SeatGridDraft } from '@/utils/layout/seat-grid-draft'

// 列の間隔 80・行の間隔 60 のグリッド。原点だけを差し替えて使う
const grid = (cells: (string | null)[][], originX = 100, originY = 200): SeatGridDraft => ({
  cells,
  originX,
  originY,
  colPitch: 80,
  rowPitch: 60,
})

describe('isSameSeatGridDraft', () => {
  const base = grid([
    ['a', null],
    ['b', 'c'],
  ])

  it('原点・間隔・各セルの中身が全て同じなら別のオブジェクトでも同じとみなす', () => {
    const copy = grid([
      ['a', null],
      ['b', 'c'],
    ])
    expect(isSameSeatGridDraft(base, copy)).toBe(true)
  })

  it('原点の x だけが違えば違うとみなす', () => {
    expect(isSameSeatGridDraft({ ...base, originX: 101 }, base)).toBe(false)
  })

  it('原点の y だけが違えば違うとみなす', () => {
    expect(isSameSeatGridDraft({ ...base, originY: 201 }, base)).toBe(false)
  })

  it('列の間隔だけが違えば違うとみなす', () => {
    expect(isSameSeatGridDraft({ ...base, colPitch: 81 }, base)).toBe(false)
  })

  it('行の間隔だけが違えば違うとみなす', () => {
    expect(isSameSeatGridDraft({ ...base, rowPitch: 61 }, base)).toBe(false)
  })

  it('行が少なければ、残った行の中身が同じでも違うとみなす', () => {
    expect(isSameSeatGridDraft(grid([['a', null]]), base)).toBe(false)
  })

  it('行の中の列が少なければ、残ったセルの中身が同じでも違うとみなす', () => {
    expect(isSameSeatGridDraft(grid([['a'], ['b', 'c']]), base)).toBe(false)
  })

  it('2行目の1セルだけ中身が違えば違うとみなす', () => {
    expect(
      isSameSeatGridDraft(
        grid([
          ['a', null],
          ['b', 'd'],
        ]),
        base
      )
    ).toBe(false)
  })
})

describe('computeMovedSeatIds', () => {
  it('同じグリッドなら動いた席は無い', () => {
    const cells = [
      [null, 'a'],
      ['b', null],
    ]
    expect(computeMovedSeatIds(grid(cells), grid(cells), new Set())).toEqual(new Set())
  })

  it('上と左に行・列を足して原点を補正しただけなら、インデックスがずれても動いていない', () => {
    const baseline = grid([['a']])
    const current = grid(
      [
        [null, null],
        [null, 'a'],
      ],
      20,
      140
    )
    expect(computeMovedSeatIds(current, baseline, new Set())).toEqual(new Set())
  })

  it('上と左の行・列を消して原点を補正しただけなら、インデックスがずれても動いていない', () => {
    const baseline = grid(
      [
        [null, null],
        [null, 'a'],
      ],
      20,
      140
    )
    const current = grid([['a']])
    expect(computeMovedSeatIds(current, baseline, new Set())).toEqual(new Set())
  })

  it('横にだけ動いた席を数える', () => {
    const baseline = grid([['a', null, 'b']])
    const current = grid([[null, 'a', 'b']])
    expect(computeMovedSeatIds(current, baseline, new Set())).toEqual(new Set(['a']))
  })

  it('縦にだけ動いた席を数える', () => {
    const baseline = grid([['a', 'b'], [null]])
    const current = grid([[null, 'b'], ['a']])
    expect(computeMovedSeatIds(current, baseline, new Set())).toEqual(new Set(['a']))
  })

  it('編集開始時のグリッドに無い席は数えない', () => {
    const baseline = grid([['a', null]])
    const current = grid([['a', 'x']])
    expect(computeMovedSeatIds(current, baseline, new Set())).toEqual(new Set())
  })

  it('下書き追加席として渡した id は、編集開始時のグリッドの別の位置にあっても数えない', () => {
    const baseline = grid([['n', null]])
    const current = grid([[null, 'n']])
    expect(computeMovedSeatIds(current, baseline, new Set(['n']))).toEqual(new Set())
  })
})
