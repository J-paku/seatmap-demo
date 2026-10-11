import { describe, it, expect } from 'vitest'
import { LONG_PRESS_DURATION, MOVE_THRESHOLD } from './detect-long-press'

describe('長押し判定のしきい値', () => {
  it('500ms 押し続けたら長押しとみなす', () => {
    expect(LONG_PRESS_DURATION).toBe(500)
  })

  it('x か y が 10px を超えて動いたら長押しを取り消す', () => {
    expect(MOVE_THRESHOLD).toBe(10)
  })
})
