import { describe, it, expect } from 'vitest'
import { LINE_TO_PX, PINCH_PX_PER_LEVEL, WHEEL_PER_LEVEL } from './convert-wheel-delta'

describe('ホイール換算の係数', () => {
  it('1レベル分の移動量と行の px 換算は正の値', () => {
    expect(WHEEL_PER_LEVEL).toBeGreaterThan(0)
    expect(PINCH_PX_PER_LEVEL).toBeGreaterThan(0)
    expect(LINE_TO_PX).toBeGreaterThan(0)
  })

  it('行スクロール3行分(1ノッチ相当)は1レベルの上限を超えない', () => {
    expect(LINE_TO_PX * 3).toBeLessThanOrEqual(WHEEL_PER_LEVEL)
  })
})
