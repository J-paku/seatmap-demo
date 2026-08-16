import { describe, it, expect } from 'vitest'
import {
  GHOST_MIN_SIZE,
  rectOf,
  rectsIntersect,
  insetRect,
  clampGhostDisplaySize,
  pointInRect,
  clampRectToViewBox,
  boundingBoxOf,
  type Rect,
} from './rect'

describe('rectOf', () => {
  it('width/height を w/h に写像する', () => {
    expect(rectOf({ x: 10, y: 20, width: 30, height: 40 })).toEqual({ x: 10, y: 20, w: 30, h: 40 })
  })

  it('幅・高さが0でもそのまま写像する', () => {
    expect(rectOf({ x: 0, y: 0, width: 0, height: 0 })).toEqual({ x: 0, y: 0, w: 0, h: 0 })
  })

  it('負の座標もそのまま通す', () => {
    expect(rectOf({ x: -5, y: -8, width: 10, height: 10 })).toEqual({ x: -5, y: -8, w: 10, h: 10 })
  })
})

describe('rectsIntersect', () => {
  it('重なっている矩形は true', () => {
    const a: Rect = { x: 0, y: 0, w: 10, h: 10 }
    const b: Rect = { x: 5, y: 5, w: 10, h: 10 }
    expect(rectsIntersect(a, b)).toBe(true)
  })

  it('接触(辺が一致するだけ)は非交差として false', () => {
    const a: Rect = { x: 0, y: 0, w: 10, h: 10 }
    const b: Rect = { x: 10, y: 0, w: 10, h: 10 }
    expect(rectsIntersect(a, b)).toBe(false)
  })

  it('完全に離れている矩形は false', () => {
    const a: Rect = { x: 0, y: 0, w: 10, h: 10 }
    const b: Rect = { x: 100, y: 100, w: 10, h: 10 }
    expect(rectsIntersect(a, b)).toBe(false)
  })

  it('一方が他方を完全に内包する場合は true', () => {
    const outer: Rect = { x: 0, y: 0, w: 100, h: 100 }
    const inner: Rect = { x: 10, y: 10, w: 5, h: 5 }
    expect(rectsIntersect(outer, inner)).toBe(true)
  })

  it('完全一致する矩形同士は true', () => {
    const a: Rect = { x: 5, y: 5, w: 20, h: 20 }
    const b: Rect = { x: 5, y: 5, w: 20, h: 20 }
    expect(rectsIntersect(a, b)).toBe(true)
  })
})

describe('insetRect', () => {
  it('通常の内側縮小', () => {
    const r: Rect = { x: 0, y: 0, w: 100, h: 50 }
    expect(insetRect(r, 10)).toEqual({ x: 10, y: 10, w: 80, h: 30 })
  })

  it('by=0 は無変化', () => {
    const r: Rect = { x: 5, y: 5, w: 40, h: 20 }
    expect(insetRect(r, 0)).toEqual({ x: 5, y: 5, w: 40, h: 20 })
  })

  it('by が寸法を超えると中心へ潰れ、幅高さは0未満にならない', () => {
    const r: Rect = { x: 0, y: 0, w: 20, h: 10 }
    const result = insetRect(r, 100)
    expect(result).toEqual({ x: 10, y: 5, w: 0, h: 0 })
    // 潰れた点は元の矩形の中心と一致する
    expect(result.x).toBe(r.x + r.w / 2)
    expect(result.y).toBe(r.y + r.h / 2)
  })
})

describe('clampGhostDisplaySize', () => {
  it('最小値(44px)を下回るサイズは44pxへ引き上げる', () => {
    expect(clampGhostDisplaySize({ width: 20, height: 30 })).toEqual({ width: 44, height: 44 })
  })

  it('最小値ちょうどは無変化', () => {
    expect(clampGhostDisplaySize({ width: 44, height: 44 })).toEqual({ width: 44, height: 44 })
  })

  it('上限クランプは無いため大きいサイズはそのまま通す', () => {
    expect(clampGhostDisplaySize({ width: 500, height: 800 })).toEqual({ width: 500, height: 800 })
  })

  it('片方だけ最小値未満のときはその軸だけ引き上げる', () => {
    expect(clampGhostDisplaySize({ width: 10, height: 100 })).toEqual({ width: 44, height: 100 })
  })
})

describe('pointInRect', () => {
  const r: Rect = { x: 10, y: 10, w: 20, h: 20 }

  it('内部の点は true', () => {
    expect(pointInRect(15, 15, r)).toBe(true)
  })

  it('境界(左上角)は含む(等号あり)', () => {
    expect(pointInRect(10, 10, r)).toBe(true)
  })

  it('境界(右下角)は含む(等号あり)', () => {
    expect(pointInRect(30, 30, r)).toBe(true)
  })

  it('矩形外の点は false', () => {
    expect(pointInRect(9, 15, r)).toBe(false)
    expect(pointInRect(31, 15, r)).toBe(false)
    expect(pointInRect(15, 9, r)).toBe(false)
    expect(pointInRect(15, 31, r)).toBe(false)
  })
})

describe('clampRectToViewBox', () => {
  it('viewBox 内に収まっていれば無変化', () => {
    const r: Rect = { x: 100, y: 100, w: 50, h: 50 }
    expect(clampRectToViewBox(r, 1600, 1154)).toEqual(r)
  })

  it('x が負なら0にクランプする', () => {
    const r: Rect = { x: -20, y: 100, w: 50, h: 50 }
    expect(clampRectToViewBox(r, 1600, 1154)).toEqual({ x: 0, y: 100, w: 50, h: 50 })
  })

  it('右端が viewBox を超えるなら viewW-w にクランプする', () => {
    const r: Rect = { x: 1590, y: 100, w: 50, h: 50 }
    expect(clampRectToViewBox(r, 1600, 1154)).toEqual({ x: 1550, y: 100, w: 50, h: 50 })
  })

  it('矩形自体が viewBox より大きいと x が負に落ちる(GHOST_MIN_SIZE超の巨大配置の境界動作)', () => {
    const r: Rect = { x: 0, y: 0, w: 2000, h: 50 }
    // viewW - r.w = 1600 - 2000 = -400 のほうが Math.max(r.x,0)=0 より小さいため
    // Math.min(0, -400) = -400 になる
    expect(clampRectToViewBox(r, 1600, 1154)).toEqual({ x: -400, y: 0, w: 2000, h: 50 })
  })
})

describe('boundingBoxOf', () => {
  it('空配列は null', () => {
    expect(boundingBoxOf([])).toBeNull()
  })

  it('単一矩形は自分自身と同じ', () => {
    const r: Rect = { x: 5, y: 5, w: 10, h: 10 }
    expect(boundingBoxOf([r])).toEqual(r)
  })

  it('複数矩形の外接矩形を計算する', () => {
    const rects: Rect[] = [
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 20, y: 5, w: 10, h: 30 },
    ]
    expect(boundingBoxOf(rects)).toEqual({ x: 0, y: 0, w: 30, h: 35 })
  })

  it('負の座標を含む矩形群も正しく外接する', () => {
    const rects: Rect[] = [
      { x: -10, y: -5, w: 5, h: 5 },
      { x: 0, y: 0, w: 5, h: 5 },
    ]
    expect(boundingBoxOf(rects)).toEqual({ x: -10, y: -5, w: 15, h: 10 })
  })

  it('GHOST_MIN_SIZE 未満の矩形が混ざっても座標計算は変わらない', () => {
    const tiny: Rect = { x: 0, y: 0, w: GHOST_MIN_SIZE - 1, h: GHOST_MIN_SIZE - 1 }
    expect(boundingBoxOf([tiny])).toEqual(tiny)
  })
})
