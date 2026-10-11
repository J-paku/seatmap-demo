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
    rects.forEach(rect => {
      expect(typeof rect.x).toBe('number')
      expect(typeof rect.y).toBe('number')
      expect(typeof rect.w).toBe('number')
      expect(typeof rect.color).toBe('string')
    })
  })

  it('rect coordinates should be within grid bounds', () => {
    const rects = buildKuroxxxRects()
    rects.forEach(rect => {
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
    rects.forEach(rect => {
      expect(HEX_COLOR_REGEX.test(rect.color)).toBe(true)
    })
  })

  it('rects should be deterministic (same output on multiple calls)', () => {
    const rects1 = buildKuroxxxRects()
    const rects2 = buildKuroxxxRects()
    expect(JSON.stringify(rects1)).toBe(JSON.stringify(rects2))
  })

  // 色 → ドット絵の 1 文字。設計図の legend と同じ対応
  const CHAR_OF_COLOR: Record<string, string> = {
    '#26222B': 'K',
    '#FCF7F3': 'W',
    '#F4B8CE': 'P',
    '#15121A': 'E',
    '#9A5566': 'M',
    '#F2A9C6': 'R',
    '#FFFFFF': 'G',
  }

  // rects を 16x16 の文字グリッドに描き戻す (rect の無いセルは '.')
  const paint = (rects: ReturnType<typeof buildKuroxxxRects>): string[] => {
    const grid = Array.from({ length: KUROXXX_GRID_SIZE }, () =>
      Array<string>(KUROXXX_GRID_SIZE).fill('.')
    )
    for (const rect of rects) {
      for (let i = 0; i < rect.w; i++) {
        grid[rect.y][rect.x + i] = CHAR_OF_COLOR[rect.color]
      }
    }
    return grid.map(row => row.join(''))
  }

  it('rects を描き戻すと猫耳フード・髑髏・顔・胴体・脚の設計図どおりの絵になる', () => {
    expect(paint(buildKuroxxxRects())).toEqual([
      '..KK........KK..',
      '..KKKK....KKKK..',
      '.KKKKKK..KKKKKK.',
      '.KKKKKKKKKKKKKK.',
      '.KKKKKPPPPKKKKK.',
      '.KKKKPEPPEPKKKK.',
      '.KKKKKPPPPKKKKK.',
      '.KKWWWWWWWWWWKK.',
      '.KWEWWWWWWWWEWK.',
      '.KWEGWWWWWWGEWK.',
      '.KWWEWWWWWWEWWK.',
      '.KWRRWWMMWWRRWK.',
      '.KKWWWWWWWWWWKK.',
      '..KKKKKKKKKKKK..',
      '...KKK....KKK...',
      '...KKK....KKK...',
    ])
  })

  it('横に同じ色が続くところは 1 つの rect にまとまり、隣り合う rect は必ず色が違う', () => {
    const rects = buildKuroxxxRects()
    // 1 行目は左右の耳の 2 本だけ
    expect(rects.filter(rect => rect.y === 0)).toEqual([
      { x: 2, y: 0, w: 2, color: '#26222B' },
      { x: 12, y: 0, w: 2, color: '#26222B' },
    ])
    // 隙間なく接している左右の rect の組 (顔の行などに必ずある)
    const touching = rects.flatMap(left =>
      rects
        .filter(right => right.y === left.y && right.x === left.x + left.w)
        .map(right => [left.color, right.color])
    )
    expect(touching.length).toBeGreaterThan(0)
    for (const [leftColor, rightColor] of touching) {
      expect(rightColor).not.toBe(leftColor)
    }
  })
})
