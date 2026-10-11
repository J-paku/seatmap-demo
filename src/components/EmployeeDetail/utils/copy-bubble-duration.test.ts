import { describe, it, expect } from 'vitest'
import { BUBBLE_MS } from './copy-bubble-duration'

describe('BUBBLE_MS', () => {
  it('コピー成功の吹き出しは 1.6 秒出す', () => {
    expect(BUBBLE_MS).toBe(1600)
  })
})
