import { describe, expect, it } from 'vitest'
import { GLOW_MS, GLOW_REDUCED_MS, SCROLL_DELAY_MS } from './time-seat-highlight'

describe('検索ヒット座席への追従の時間', () => {
  it('光らせる時間は通常 2200ms、動きを減らす設定では 420ms', () => {
    expect(GLOW_MS).toBe(2200)
    expect(GLOW_REDUCED_MS).toBe(420)
  })

  it('動きを減らす設定の方が短い', () => {
    expect(GLOW_REDUCED_MS).toBeLessThan(GLOW_MS)
  })

  it('スクロールはクリックロック 350ms の直後の 360ms 待ってから動かす', () => {
    expect(SCROLL_DELAY_MS).toBe(360)
    expect(SCROLL_DELAY_MS).toBeGreaterThan(350)
  })
})
