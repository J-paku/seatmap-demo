import { describe, it, expect } from 'vitest'
import { NOTICE_MS } from './show-notice-constants'

describe('NOTICE_MS', () => {
  it('座席未設定などの一時通知は2.4秒で消す', () => {
    expect(NOTICE_MS).toBe(2400)
  })
})
