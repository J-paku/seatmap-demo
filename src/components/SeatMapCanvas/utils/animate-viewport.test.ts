import { describe, it, expect } from 'vitest'
import { TRANSITION_MS } from './animate-viewport'

describe('TRANSITION_MS', () => {
  it('アニメーション付きの移動は 300ms で transition を外す', () => {
    expect(TRANSITION_MS).toBe(300)
  })
})
