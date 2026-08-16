import { describe, it, expect } from 'vitest'
import { hexToRgba, normalizeHex } from '@/utils/color'

describe('hexToRgba', () => {
  it('converts a leading-# 6-digit hex to an rgba string', () => {
    expect(hexToRgba('#FF0000', 1)).toBe('rgba(255, 0, 0, 1)')
  })

  it('accepts a hex string without a leading #', () => {
    expect(hexToRgba('00FF00', 0.5)).toBe('rgba(0, 255, 0, 0.5)')
  })

  it('lowercases and alpha=0 pass through unchanged', () => {
    expect(hexToRgba('#a1b2c3', 0)).toBe('rgba(161, 178, 195, 0)')
  })

  it('does not expand a 3-digit hex, producing NaN for the blue channel', () => {
    // hexToRgba assumes an already-normalized 6-digit hex. A 3-digit input
    // is not expanded, so slice(4, 6) is empty and parseInt('', 16) is NaN.
    expect(hexToRgba('#ABC', 1)).toBe('rgba(171, 12, NaN, 1)')
  })

  it('produces NaN channels for non-hex characters', () => {
    expect(hexToRgba('#GGHHII', 1)).toBe('rgba(NaN, NaN, NaN, 1)')
  })
})

describe('normalizeHex', () => {
  it('doubles a 3-digit hex and uppercases it', () => {
    expect(normalizeHex('#abc')).toBe('#AABBCC')
  })

  it('accepts a 3-digit hex without a leading #', () => {
    expect(normalizeHex('abc')).toBe('#AABBCC')
  })

  it('uppercases an already 6-digit hex', () => {
    expect(normalizeHex('#AABBCC')).toBe('#AABBCC')
  })

  it('trims surrounding whitespace before validating', () => {
    expect(normalizeHex('  #abc  ')).toBe('#AABBCC')
  })

  it('accepts a bare 6-digit hex without #', () => {
    expect(normalizeHex('123456')).toBe('#123456')
  })

  it('rejects a 4-digit hex (neither 3 nor 6 digits)', () => {
    expect(normalizeHex('#abcd')).toBeNull()
  })

  it('rejects an empty string', () => {
    expect(normalizeHex('')).toBeNull()
  })

  it('rejects non-hex characters', () => {
    expect(normalizeHex('#zzzzzz')).toBeNull()
  })

  it('rejects a double leading # (only one # is stripped)', () => {
    expect(normalizeHex('##abc')).toBeNull()
  })
})
