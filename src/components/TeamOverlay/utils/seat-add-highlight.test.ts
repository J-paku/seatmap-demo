import { describe, expect, it } from 'vitest'
import { SEAT_ADD_HIGHLIGHT_MS } from './seat-add-highlight'

describe('SEAT_ADD_HIGHLIGHT_MS', () => {
  it('追加直後の席は 1.8 秒だけハイライトしておく', () => {
    expect(SEAT_ADD_HIGHLIGHT_MS).toBe(1800)
  })
})
