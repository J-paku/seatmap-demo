import { describe, it, expect } from 'vitest'
import {
  DEFAULT_SEAT_HEIGHT,
  DEFAULT_SEAT_WIDTH,
  RELAYOUT_COL_GAP,
  RELAYOUT_PADDING,
  RELAYOUT_ROW_GAP,
  fitAreaToSeats,
  relayoutSeatsInGrid,
  sortSeatsForRelayout,
} from './seat-relayout'
import type { Rect } from './rect'
import type { Seat } from '@/types'

const seat = (overrides: Partial<Seat>): Seat => ({
  id: 's',
  teamId: 'team-01',
  x: 0,
  y: 0,
  width: DEFAULT_SEAT_WIDTH,
  height: DEFAULT_SEAT_HEIGHT,
  rotation: 0,
  employeeId: null,
  ...overrides,
})

describe('sortSeatsForRelayout', () => {
  it('y昇順、同じyならx昇順で並べる', () => {
    const seats = [
      seat({ id: 'c', x: 10, y: 100 }),
      seat({ id: 'a', x: 50, y: 0 }),
      seat({ id: 'b', x: 10, y: 0 }),
    ]
    const sorted = sortSeatsForRelayout(seats)
    expect(sorted.map((s) => s.id)).toEqual(['b', 'a', 'c'])
  })

  it('元の配列を変更しない(イミュータブル)', () => {
    const seats = [seat({ id: 'b', y: 10 }), seat({ id: 'a', y: 0 })]
    const original = [...seats]
    sortSeatsForRelayout(seats)
    expect(seats).toEqual(original)
  })
})

describe('relayoutSeatsInGrid', () => {
  it('area左上+パディング20を起点に、指定列数で均一ピッチ配置する', () => {
    const area: Rect = { x: 1000, y: 500, w: 999, h: 999 }
    const seats = [
      seat({ id: 's1', x: 999, y: 999 }),
      seat({ id: 's2', x: 999, y: 999 }),
      seat({ id: 's3', x: 999, y: 999 }),
    ]
    const result = relayoutSeatsInGrid(seats, area, 2)
    const originX = area.x + RELAYOUT_PADDING
    const originY = area.y + RELAYOUT_PADDING
    expect(result[0]).toMatchObject({ x: originX, y: originY, width: DEFAULT_SEAT_WIDTH, height: DEFAULT_SEAT_HEIGHT })
    expect(result[1]).toMatchObject({ x: originX + (DEFAULT_SEAT_WIDTH + RELAYOUT_COL_GAP), y: originY })
    // 3件目はcols=2なので折り返して2行目の先頭
    expect(result[2]).toMatchObject({ x: originX, y: originY + (DEFAULT_SEAT_HEIGHT + RELAYOUT_ROW_GAP) })
  })

  it('入力の座席サイズに関わらず既定サイズへ強制する', () => {
    const area: Rect = { x: 0, y: 0, w: 500, h: 500 }
    const seats = [seat({ id: 's1', width: 300, height: 300 })]
    const result = relayoutSeatsInGrid(seats, area, 3)
    expect(result[0].width).toBe(DEFAULT_SEAT_WIDTH)
    expect(result[0].height).toBe(DEFAULT_SEAT_HEIGHT)
  })

  it('入力順に関わらず y→x でソートしてから配置する', () => {
    const area: Rect = { x: 0, y: 0, w: 500, h: 500 }
    const seats = [seat({ id: 'later', x: 10, y: 100 }), seat({ id: 'first', x: 0, y: 0 })]
    const result = relayoutSeatsInGrid(seats, area, 2)
    expect(result[0].id).toBe('first')
    expect(result[1].id).toBe('later')
  })

  it('空配列を渡すと空配列を返す', () => {
    const area: Rect = { x: 0, y: 0, w: 500, h: 500 }
    expect(relayoutSeatsInGrid([], area, 2)).toEqual([])
  })
})

describe('fitAreaToSeats', () => {
  it('座席が空ならフォールバックをそのまま返す', () => {
    const fallback: Rect = { x: 1, y: 2, w: 3, h: 4 }
    expect(fitAreaToSeats([], fallback)).toEqual(fallback)
  })

  it('バウンディングボックス+パディング20が最小値未満なら200×100へクランプする', () => {
    const fallback: Rect = { x: 0, y: 0, w: 0, h: 0 }
    // 1席のみ: 105×75。 幅=105+40=145<200→200にクランプ。高さ=75+40=115>100→クランプなし
    const seats = [seat({ id: 's1', x: 10, y: 20, width: 105, height: 75 })]
    const result = fitAreaToSeats(seats, fallback)
    expect(result).toEqual({ x: 10 - 20, y: 20 - 20, w: 200, h: 115 })
  })

  it('バウンディングボックスが最小値を超える場合はクランプしない', () => {
    const fallback: Rect = { x: 0, y: 0, w: 0, h: 0 }
    const seats = [
      seat({ id: 's1', x: 0, y: 0, width: 200, height: 200 }),
      seat({ id: 's2', x: 500, y: 500, width: 100, height: 100 }),
    ]
    const result = fitAreaToSeats(seats, fallback)
    // bbox: x=0,y=0, maxX=600,maxY=600 → w=600,h=600
    expect(result).toEqual({ x: -20, y: -20, w: 600 + 40, h: 600 + 40 })
  })
})
