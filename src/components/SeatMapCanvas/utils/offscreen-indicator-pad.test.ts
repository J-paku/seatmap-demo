import { describe, it, expect } from 'vitest'
import { PAD } from './offscreen-indicator-pad'

describe('PAD', () => {
  it('エッジタグを辺から内側へ寄せる正の幅', () => {
    expect(PAD).toBeGreaterThan(0)
  })
})
