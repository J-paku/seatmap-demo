import { describe, it, expect } from 'vitest'
import { DRAG_CONFIRM_PX } from './confirm-drag'

describe('DRAG_CONFIRM_PX', () => {
  it('3px を超えて動いたらドラッグ確定とみなす', () => {
    expect(DRAG_CONFIRM_PX).toBe(3)
  })
})
