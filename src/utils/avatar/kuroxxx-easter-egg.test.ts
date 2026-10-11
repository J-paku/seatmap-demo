import { describe, it, expect } from 'vitest'
import { KUROXXX_GRID_SIZE, buildKuroxxxRects } from '@/utils/avatar/kuroxxx-easter-egg'

describe('kuroxxx-easter-egg', () => {
  it('KUROXXX_GRID_SIZE should be 16', () => {
    expect(KUROXXX_GRID_SIZE).toBe(16)
  })

  it('buildKuroxxxRects should return an array', () => {
    const rects = buildKuroxxxRects()
    expect(Array.isArray(rects)).toBe(true)
  })

  it('buildKuroxxxRects should return at least one rect', () => {
    const rects = buildKuroxxxRects()
    expect(rects.length).toBeGreaterThan(0)
  })

  it('all rects should have required properties', () => {
    const rects = buildKuroxxxRects()
    rects.forEach((rect) => {
      expect(typeof rect.x).toBe('number')
      expect(typeof rect.y).toBe('number')
      expect(typeof rect.w).toBe('number')
      expect(typeof rect.color).toBe('string')
    })
  })

  it('rect coordinates should be within grid bounds', () => {
    const rects = buildKuroxxxRects()
    rects.forEach((rect) => {
      expect(rect.x).toBeGreaterThanOrEqual(0)
      expect(rect.x).toBeLessThan(KUROXXX_GRID_SIZE)
      expect(rect.y).toBeGreaterThanOrEqual(0)
      expect(rect.y).toBeLessThan(KUROXXX_GRID_SIZE)
      expect(rect.w).toBeGreaterThan(0)
      expect(rect.x + rect.w).toBeLessThanOrEqual(KUROXXX_GRID_SIZE)
    })
  })

  it('rect colors should be valid hex codes', () => {
    const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/
    const rects = buildKuroxxxRects()
    rects.forEach((rect) => {
      expect(HEX_COLOR_REGEX.test(rect.color)).toBe(true)
    })
  })

  it('rects should be deterministic (same output on multiple calls)', () => {
    const rects1 = buildKuroxxxRects()
    const rects2 = buildKuroxxxRects()
    expect(JSON.stringify(rects1)).toBe(JSON.stringify(rects2))
  })
})
