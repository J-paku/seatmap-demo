import { describe, it, expect } from 'vitest'
import { formatPhone } from './format-phone'

describe('formatPhone', () => {
  it('11文字の番号を 3-4-4 で区切る', () => {
    expect(formatPhone('09012345678')).toBe('090-1234-5678')
  })

  it('伏せ字の下4桁も数字と同じく文字数だけで区切る', () => {
    expect(formatPhone('0801234xxxx')).toBe('080-1234-xxxx')
  })

  it('11文字でない値は区切らずにそのまま返す', () => {
    expect(formatPhone('0312345678')).toBe('0312345678')
    expect(formatPhone('090123456789')).toBe('090123456789')
    expect(formatPhone('')).toBe('')
  })
})
