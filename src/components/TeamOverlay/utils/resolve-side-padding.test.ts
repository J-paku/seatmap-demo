import { describe, expect, it } from 'vitest'
import { resolveSidePadding } from './resolve-side-padding'
import { COMPACT_SIDE_PADDING_PX } from './seat-grid'

describe('resolveSidePadding', () => {
  it('Compact ではグリッドの左右パディングと同じ値', () => {
    expect(resolveSidePadding(true)).toBe(COMPACT_SIDE_PADDING_PX)
  })

  it('Desktop では余白を足さない', () => {
    expect(resolveSidePadding(false)).toBe(0)
  })
})
