import { describe, it, expect } from 'vitest'
import { GHOST_MAX_SIZE } from './ghost-drag-limits'

describe('ゴーストを掴んでいる間の寸法', () => {
  it('ゴーストの最大辺は viewBox 単位で2500', () => {
    expect(GHOST_MAX_SIZE).toBe(2500)
  })
})
