import { describe, it, expect } from 'vitest'
import { MAX_CUSTOM_LAYOUTS } from './custom-layout-limit'

describe('MAX_CUSTOM_LAYOUTS', () => {
  it('作成フォームの件数カウンターに出せる正の整数である', () => {
    expect(Number.isInteger(MAX_CUSTOM_LAYOUTS)).toBe(true)
    expect(MAX_CUSTOM_LAYOUTS).toBeGreaterThan(0)
  })
})
