import { describe, it, expect } from 'vitest'
import { TOAST_MS } from './save-layout-constants'

describe('TOAST_MS', () => {
  it('保存成功トーストは仕様通り5秒出す', () => {
    expect(TOAST_MS).toBe(5000)
  })
})
