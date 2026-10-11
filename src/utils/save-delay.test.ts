import { describe, it, expect } from 'vitest'
import { FINISH_DELAY_MS } from './save-delay'

describe('FINISH_DELAY_MS', () => {
  it('保存中表現の疑似遅延は0.4秒', () => {
    expect(FINISH_DELAY_MS).toBe(400)
  })
})
