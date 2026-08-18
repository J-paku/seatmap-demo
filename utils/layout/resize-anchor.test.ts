import { describe, it, expect } from 'vitest'
import { resizeRectToPointer, RESIZE_HANDLES } from './resize-anchor'
import type { Rect } from './rect'
import type { ResizeLimits } from './resize-anchor'

describe('RESIZE_HANDLES', () => {
  it('8方向を規定順序で保持する', () => {
    expect(RESIZE_HANDLES).toEqual(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'])
  })
})

describe('resizeRectToPointer', () => {
  const rect: Rect = { x: 100, y: 100, w: 200, h: 150 }
  const limits: ResizeLimits = { minW: 40, minH: 40, max: 2500 }

  it('"e" 東辺の真上を指すと無変化', () => {
    expect(resizeRectToPointer(rect, 'e', { x: 300, y: 0 }, limits)).toEqual({ x: 100, y: 100, w: 200, h: 150 })
  })

  it('"e" 幅はアンカー(西辺)からの距離になる', () => {
    expect(resizeRectToPointer(rect, 'e', { x: 400, y: 0 }, limits)).toEqual({ x: 100, y: 100, w: 300, h: 150 })
  })

  it('"e" アンカー側へ寄せると縮む', () => {
    expect(resizeRectToPointer(rect, 'e', { x: 150, y: 0 }, limits)).toEqual({ x: 100, y: 100, w: 50, h: 150 })
  })

  it('"e" minW で止まる', () => {
    expect(resizeRectToPointer(rect, 'e', { x: 120, y: 0 }, limits)).toEqual({ x: 100, y: 100, w: 40, h: 150 })
  })

  it('"e" アンカーを跨ぐと反対側へ回り込まず同じ側で鏡像に伸び直す', () => {
    expect(resizeRectToPointer(rect, 'e', { x: 0, y: 0 }, limits)).toEqual({ x: 100, y: 100, w: 100, h: 150 })
  })

  it('"e" max で止まる', () => {
    expect(resizeRectToPointer(rect, 'e', { x: 5000, y: 0 }, limits)).toEqual({ x: 100, y: 100, w: 2500, h: 150 })
  })

  it('"w" 西辺の真上を指すと無変化', () => {
    expect(resizeRectToPointer(rect, 'w', { x: 100, y: 0 }, limits)).toEqual({ x: 100, y: 100, w: 200, h: 150 })
  })

  it('"w" は東辺(300)を固定したまま原点が動く', () => {
    const result = resizeRectToPointer(rect, 'w', { x: 200, y: 0 }, limits)
    expect(result).toEqual({ x: 200, y: 100, w: 100, h: 150 })
    expect(result.x + result.w).toBe(300)
  })

  it('"w" minW で止まっても東辺は300のまま', () => {
    const result = resizeRectToPointer(rect, 'w', { x: 340, y: 0 }, limits)
    expect(result).toEqual({ x: 260, y: 100, w: 40, h: 150 })
    expect(result.x + result.w).toBe(300)
  })

  it('"n" 北辺の真上を指すと無変化', () => {
    expect(resizeRectToPointer(rect, 'n', { x: 0, y: 100 }, limits)).toEqual({ x: 100, y: 100, w: 200, h: 150 })
  })

  it('"n" minH で止まっても南辺は250のまま', () => {
    const result = resizeRectToPointer(rect, 'n', { x: 0, y: 220 }, limits)
    expect(result).toEqual({ x: 100, y: 210, w: 200, h: 40 })
    expect(result.y + result.h).toBe(250)
  })

  it('"s" 高さはアンカー(北辺)からの距離になる', () => {
    expect(resizeRectToPointer(rect, 's', { x: 0, y: 400 }, limits)).toEqual({ x: 100, y: 100, w: 200, h: 300 })
  })

  it('"se" は2軸を同時に解く', () => {
    expect(resizeRectToPointer(rect, 'se', { x: 400, y: 400 }, limits)).toEqual({ x: 100, y: 100, w: 300, h: 300 })
  })

  it('"nw" は2軸とも下限で止まる', () => {
    expect(resizeRectToPointer(rect, 'nw', { x: 280, y: 240 }, limits)).toEqual({ x: 260, y: 210, w: 40, h: 40 })
  })
})
