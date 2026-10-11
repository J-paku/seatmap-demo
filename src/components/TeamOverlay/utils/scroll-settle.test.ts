import { describe, expect, it } from 'vitest'
import { SCROLL_SETTLE_MS } from './scroll-settle'

describe('SCROLL_SETTLE_MS', () => {
  it('最後の scroll から 140ms 何も来なければ慣性スクロールが止まったとみなす', () => {
    expect(SCROLL_SETTLE_MS).toBe(140)
  })
})
