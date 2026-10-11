import { describe, it, expect } from 'vitest'
import { OVERSCROLL_HIGH, OVERSCROLL_LOW, TAP_LEVEL, TAP_MS } from './pinch-zoom-limits'

describe('2本指タップの判定', () => {
  it('接触 250ms 以内かつ log2 の変動 0.07 以内を2本指タップとみなす', () => {
    expect(TAP_MS).toBe(250)
    expect(TAP_LEVEL).toBe(0.07)
  })
})

describe('バウンスの緩め幅', () => {
  it('下限は 0 より大きく 1 より小さい倍率で緩める', () => {
    expect(OVERSCROLL_LOW).toBeGreaterThan(0)
    expect(OVERSCROLL_LOW).toBeLessThan(1)
  })

  it('上限は 1 より大きい倍率で緩める', () => {
    expect(OVERSCROLL_HIGH).toBeGreaterThan(1)
  })
})
