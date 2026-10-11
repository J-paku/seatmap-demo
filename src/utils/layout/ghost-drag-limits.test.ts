import { describe, it, expect } from 'vitest'
import { DRAG_CONFIRM_PX, GHOST_MAX_SIZE } from './ghost-drag-limits'

describe('ゴーストを掴んでいる間のしきい値', () => {
  it('ゴーストの最大辺は viewBox 単位で2500', () => {
    expect(GHOST_MAX_SIZE).toBe(2500)
  })

  it('3px を超えて動いたらドラッグ確定とみなす', () => {
    expect(DRAG_CONFIRM_PX).toBe(3)
  })
})
