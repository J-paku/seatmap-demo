import { describe, it, expect } from 'vitest'
import { DRAG_THRESHOLD_PX } from './edit-drag-threshold'

describe('DRAG_THRESHOLD_PX', () => {
  // ゴースト側(use-ghost-drag.ts の DRAG_CONFIRM_PX)と同じ値でないと、同じ指の動きで判定が割れる
  it('ゴースト側の DRAG_CONFIRM_PX と同じ 3px', () => {
    expect(DRAG_THRESHOLD_PX).toBe(3)
  })
})
