import { describe, expect, it } from 'vitest'
import { KURO_KEY, KURO_SEQUENCE } from './match-kuro-code'

const repeat = (key: string, count: number): string[] => Array.from({ length: count }, () => key)

describe('KURO_SEQUENCE', () => {
  it('↑3 → ↓3 → ↑7 の13打鍵', () => {
    expect(KURO_SEQUENCE).toEqual([
      ...repeat('ArrowUp', 3),
      ...repeat('ArrowDown', 3),
      ...repeat('ArrowUp', 7),
    ])
  })
})

describe('KURO_KEY', () => {
  it('フックが直近の打鍵を連結して突き合わせる、カンマ区切りの文字列', () => {
    expect(KURO_KEY).toBe(
      'ArrowUp,ArrowUp,ArrowUp,ArrowDown,ArrowDown,ArrowDown,ArrowUp,ArrowUp,ArrowUp,ArrowUp,ArrowUp,ArrowUp,ArrowUp'
    )
  })
})
