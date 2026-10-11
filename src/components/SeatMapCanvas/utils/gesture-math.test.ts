import { describe, it, expect } from 'vitest'
import { averageVelocity, movedBeyond, pinchGeometry } from './gesture-math'

describe('pinchGeometry', () => {
  it('2点の中点と距離を返す', () => {
    expect(pinchGeometry({ x: 2, y: 4 }, { x: 8, y: 12 })).toEqual({ midX: 5, midY: 8, dist: 10 })
  })

  it('点の順を入れ替えても同じ結果になる', () => {
    expect(pinchGeometry({ x: 8, y: 12 }, { x: 2, y: 4 })).toEqual({ midX: 5, midY: 8, dist: 10 })
  })

  it('同じ点どうしなら距離は 0', () => {
    expect(pinchGeometry({ x: -3, y: 7 }, { x: -3, y: 7 })).toEqual({ midX: -3, midY: 7, dist: 0 })
  })
})

describe('averageVelocity', () => {
  it('サンプルが無ければ速度 0 を返す', () => {
    expect(averageVelocity([])).toEqual({ x: 0, y: 0 })
  })

  it('1件ならその速度をそのまま返す', () => {
    expect(averageVelocity([{ x: 6, y: -4 }])).toEqual({ x: 6, y: -4 })
  })

  it('複数件なら軸ごとの平均を返す', () => {
    const samples = [
      { x: 2, y: 4 },
      { x: 4, y: -2 },
      { x: 9, y: 1 },
    ]
    expect(averageVelocity(samples)).toEqual({ x: 5, y: 1 })
  })
})

describe('movedBeyond', () => {
  // (1,2) → (4,6) は距離 5
  const from = { x: 1, y: 2 }
  const to = { x: 4, y: 6 }

  it('距離がしきい値を超えたら true', () => {
    expect(movedBeyond(from, to, 4.9)).toBe(true)
  })

  it('距離がちょうどしきい値なら false(超えていない)', () => {
    expect(movedBeyond(from, to, 5)).toBe(false)
  })

  it('距離がしきい値より短ければ false', () => {
    expect(movedBeyond(from, to, 5.1)).toBe(false)
  })

  it('動いた向きに依らず距離で判定する', () => {
    expect(movedBeyond(to, from, 4.9)).toBe(true)
    expect(movedBeyond(to, from, 5)).toBe(false)
  })
})
