import { describe, it, expect } from 'vitest'
import { FETCH_JITTER_MS, FETCH_MIN_MS, REFRESH_COOLDOWN_SECONDS } from './refresh-schedule'

describe('予定の再取得の待ち時間', () => {
  it('取り込んだ後は 10 秒たつまで再取得させない', () => {
    expect(REFRESH_COOLDOWN_SECONDS).toBe(10)
  })

  it('取得の擬似遅延は 300ms に 0〜300ms の揺らぎを足す', () => {
    expect(FETCH_MIN_MS).toBe(300)
    expect(FETCH_JITTER_MS).toBe(300)
  })
})
