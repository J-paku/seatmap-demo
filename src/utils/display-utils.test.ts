import { describe, it, expect } from 'vitest'
import { getCompactNameLabel } from '@/utils/display-utils'

describe('getCompactNameLabel', () => {
  it('takes the first whitespace-separated word (half-width space)', () => {
    expect(getCompactNameLabel('Yamada Taro')).toBe('Yamada')
  })

  it('takes the first word separated by a full-width (ideographic) space', () => {
    expect(getCompactNameLabel('山田　太郎')).toBe('山田')
  })

  it('cuts at a half-width semicolon before splitting on whitespace', () => {
    expect(getCompactNameLabel('Yamada;Taro')).toBe('Yamada')
  })

  it('cuts at a full-width semicolon', () => {
    expect(getCompactNameLabel('田中；花子')).toBe('田中')
  })

  it('returns empty string for whitespace-only input', () => {
    expect(getCompactNameLabel('  ')).toBe('')
  })

  it('returns empty string for empty input', () => {
    expect(getCompactNameLabel('')).toBe('')
  })

  it('returns empty string when the segment before the semicolon is empty', () => {
    expect(getCompactNameLabel(';Taro')).toBe('')
  })

  it('returns the name as-is when it has no internal whitespace', () => {
    expect(getCompactNameLabel('Yamada')).toBe('Yamada')
  })

  it('collapses repeated whitespace and trims surrounding spaces', () => {
    expect(getCompactNameLabel('  Yamada  Taro  ')).toBe('Yamada')
  })
})
