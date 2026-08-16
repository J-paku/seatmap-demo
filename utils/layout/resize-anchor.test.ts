import { describe, it, expect } from 'vitest'
import { resizeRect, RESIZE_HANDLES } from './resize-anchor'
import type { Rect } from './rect'
import type { ResizeLimits } from './resize-anchor'

describe('RESIZE_HANDLES', () => {
  it('8方向を規定順序で保持する', () => {
    expect(RESIZE_HANDLES).toEqual(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'])
  })
})

describe('resizeRect', () => {
  const rect: Rect = { x: 100, y: 100, w: 200, h: 150 }
  const limits: ResizeLimits = { minW: 50, minH: 50, max: 500 }

  it('dx=0,dy=0 なら矩形は無変化(恒等)', () => {
    expect(resizeRect(rect, 'se', 0, 0, limits)).toEqual(rect)
  })

  it('"e" は幅だけ dx 分伸縮し x は不変。dy は無視される', () => {
    expect(resizeRect(rect, 'e', 30, 999, limits)).toEqual({ x: 100, y: 100, w: 230, h: 150 })
  })

  it('"w" は幅を dx 分縮小し、右エッジ固定のため x が移動する', () => {
    // w = clamp(200-30,50,500) = 170, x = 100+200-170 = 130
    expect(resizeRect(rect, 'w', 30, 0, limits)).toEqual({ x: 130, y: 100, w: 170, h: 150 })
  })

  it('"w" は幅が minW を割ると minW にクランプされる', () => {
    // w = clamp(200-190=10,50,500) = 50, x = 100+200-50 = 250
    expect(resizeRect(rect, 'w', 190, 0, limits)).toEqual({ x: 250, y: 100, w: 50, h: 150 })
  })

  it('"e" は幅が max を超えると max にクランプされる', () => {
    // w = clamp(200+400=600,50,500) = 500, x は不変
    expect(resizeRect(rect, 'e', 400, 0, limits)).toEqual({ x: 100, y: 100, w: 500, h: 150 })
  })

  it('"s" は高さだけ dy 分伸縮し y は不変', () => {
    expect(resizeRect(rect, 's', 0, 40, limits)).toEqual({ x: 100, y: 100, w: 200, h: 190 })
  })

  it('"n" は高さを dy 分縮小し、下エッジ固定のため y が移動する', () => {
    // h = clamp(150-40,50,500) = 110, y = 100+150-110 = 140
    expect(resizeRect(rect, 'n', 0, 40, limits)).toEqual({ x: 100, y: 140, w: 200, h: 110 })
  })

  it('"n" は高さが minH を割ると minH にクランプされる', () => {
    // h = clamp(150-140=10,50,500) = 50, y = 100+150-50 = 200
    expect(resizeRect(rect, 'n', 0, 140, limits)).toEqual({ x: 100, y: 200, w: 200, h: 50 })
  })

  it('"ne" は e(幅)とn(高さ)を同時に適用する', () => {
    // w = clamp(230,...) = 230(xは不変), h = clamp(110,...) = 110, y = 140
    expect(resizeRect(rect, 'ne', 30, 40, limits)).toEqual({ x: 100, y: 140, w: 230, h: 110 })
  })

  it('"nw" は w(幅)とn(高さ)を同時に適用する', () => {
    // w = 170,x=130 / h=110,y=140
    expect(resizeRect(rect, 'nw', 30, 40, limits)).toEqual({ x: 130, y: 140, w: 170, h: 110 })
  })

  it('"se" は e(幅)とs(高さ)を同時に適用する', () => {
    // w=230(xは不変) / h=190(yは不変)
    expect(resizeRect(rect, 'se', 30, 40, limits)).toEqual({ x: 100, y: 100, w: 230, h: 190 })
  })

  it('"sw" は w(幅)とs(高さ)を同時に適用する', () => {
    // w=170,x=130 / h=190(yは不変)
    expect(resizeRect(rect, 'sw', 30, 40, limits)).toEqual({ x: 130, y: 100, w: 170, h: 190 })
  })

  it('非制御軸(n/sを持たないハンドルのy)は元の値を保つ', () => {
    const result = resizeRect(rect, 'w', 10, 500, limits)
    expect(result.y).toBe(rect.y)
    expect(result.h).toBe(rect.h)
  })
})
