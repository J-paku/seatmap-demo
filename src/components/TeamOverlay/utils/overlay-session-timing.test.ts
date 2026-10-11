import { describe, expect, it } from 'vitest'
import { CLICK_LOCK_MS, LOAD_JITTER_MS, LOAD_MIN_MS } from './overlay-session-timing'

describe('クリックロック', () => {
  it('開いてから 350ms は誤タップ防止で操作を受け付けない', () => {
    expect(CLICK_LOCK_MS).toBe(350)
  })
})

describe('ローディング擬似', () => {
  it('最短 300ms に 0〜300ms の揺らぎを足した時間だけ出す', () => {
    expect(LOAD_MIN_MS).toBe(300)
    expect(LOAD_JITTER_MS).toBe(300)
  })
})
