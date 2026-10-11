import { describe, it, expect } from 'vitest'
import { SEATMAP_BG_ID } from './seatmap-bg-id'

describe('SEATMAP_BG_ID', () => {
  // E2E と検証スクリプトが同じ文字列を直書きしているので、値を変えるとそちらが黙って外れる
  it('背景 root の id は seatmap-bg-root', () => {
    expect(SEATMAP_BG_ID).toBe('seatmap-bg-root')
  })
})
