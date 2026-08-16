import { describe, it, expect } from 'vitest'
import { snapThreshold, computeSnap, computeResizeSnap } from './snap-guides'
import type { Rect } from './rect'
import type { ResizeLimits } from './resize-anchor'

describe('snapThreshold', () => {
  it('小さい矩形では画面基準28px側が勝つ', () => {
    const rect: Rect = { x: 0, y: 0, w: 100, h: 100 }
    // max(28/1, min(100,100)*0.15=15) = 28
    expect(snapThreshold(rect, 1)).toBe(28)
  })

  it('大きい矩形では寸法基準(短辺15%)側が勝つ', () => {
    const rect: Rect = { x: 0, y: 0, w: 1000, h: 1000 }
    // max(28/1, min(1000,1000)*0.15=150) = 150
    expect(snapThreshold(rect, 1)).toBe(150)
  })

  it('ズームインすると画面基準側の値が縮む', () => {
    const rect: Rect = { x: 0, y: 0, w: 100, h: 100 }
    // max(28/5=5.6, 15) = 15
    expect(snapThreshold(rect, 5)).toBe(15)
  })

  it('短辺(w,hの小さいほう)で寸法基準を計算する', () => {
    const rect: Rect = { x: 0, y: 0, w: 50, h: 1000 }
    // max(28/1, min(50,1000)*0.15=7.5) = 28
    expect(snapThreshold(rect, 1)).toBe(28)
  })
})

describe('computeSnap', () => {
  it('siblings が空なら吸着せず元の座標のまま', () => {
    const dragging: Rect = { x: 10, y: 10, w: 50, h: 50 }
    const result = computeSnap(dragging, [], 100)
    expect(result).toEqual({ x: 10, y: 10, guides: [] })
  })

  it('しきい値内のエッジに吸着し、ガイド線を返す', () => {
    const dragging: Rect = { x: 10, y: 0, w: 50, h: 50 }
    const sibling: Rect = { x: 15, y: 100, w: 50, h: 50 }
    const result = computeSnap(dragging, [sibling], 10)
    // x: dragLines[10,35,60] のうち sibling線[15,40,65]と最も近いのは (15,10) の距離5
    expect(result.x).toBe(15)
    // y方向は距離が全てしきい値超なので無変化
    expect(result.y).toBe(0)
    expect(result.guides).toEqual([{ axis: 'vertical', pos: 15, start: 0, end: 150 }])
  })

  it('しきい値外なら吸着せず座標もガイドも無変化', () => {
    const dragging: Rect = { x: 10, y: 0, w: 50, h: 50 }
    const sibling: Rect = { x: 200, y: 300, w: 50, h: 50 }
    const result = computeSnap(dragging, [sibling], 5)
    expect(result).toEqual({ x: 10, y: 0, guides: [] })
  })

  it('複数siblingsの中から最も近い候補を選ぶ(出会う順序に依存しない)', () => {
    const dragging: Rect = { x: 0, y: 0, w: 20, h: 20 }
    const farther: Rect = { x: 12, y: 500, w: 20, h: 20 }
    const closer: Rect = { x: 10.5, y: 500, w: 20, h: 20 }
    const result = computeSnap(dragging, [farther, closer], 5)
    // x: dragLines[0,10,20] に対し closer の中心線10.5が距離0.5で最短
    expect(result.x).toBe(0.5)
    expect(result.y).toBe(0)
    expect(result.guides).toEqual([{ axis: 'vertical', pos: 10.5, start: 0, end: 520 }])

    // siblings の順序を入れ替えても同じ結果になる
    const reordered = computeSnap(dragging, [closer, farther], 5)
    expect(reordered).toEqual(result)
  })
})

describe('computeResizeSnap', () => {
  const limits: ResizeLimits = { minW: 10, minH: 10, max: 1000 }

  it('ハンドル "e" は x終端のみ吸着し、y側は不変', () => {
    const resized: Rect = { x: 0, y: 0, w: 50, h: 50 }
    const sibling: Rect = { x: 0, y: 100, w: 60, h: 60 }
    const result = computeResizeSnap(resized, [sibling], 15, 'e', {
      minW: 40,
      minH: 40,
      max: 2000,
    })
    expect(result.rect).toEqual({ x: 0, y: 0, w: 60, h: 50 })
    expect(result.guides).toEqual([{ axis: 'vertical', pos: 60, start: 0, end: 160 }])
  })

  it('ハンドル "nw" は x始点・y始点の両方が吸着し、対辺(右・下)は固定される', () => {
    const resized: Rect = { x: 10, y: 10, w: 50, h: 50 }
    const sibling: Rect = { x: 3, y: 5, w: 10, h: 12 }
    const result = computeResizeSnap(resized, [sibling], 10, 'nw', limits)
    expect(result.rect).toEqual({ x: 8, y: 11, w: 52, h: 49 })
    // 対辺(右=60, 下=60)が固定されていることを確認する
    expect(result.rect.x + result.rect.w).toBe(60)
    expect(result.rect.y + result.rect.h).toBe(60)
    expect(result.guides).toEqual([
      { axis: 'vertical', pos: 8, start: 5, end: 60 },
      { axis: 'horizontal', pos: 11, start: 3, end: 60 },
    ])
  })

  it('吸着で最小寸法(minW)を割らせない(§04-3のクランプ保証)', () => {
    const resized: Rect = { x: 0, y: 0, w: 20, h: 20 }
    const sibling: Rect = { x: 15, y: 100, w: 0, h: 0 }
    const result = computeResizeSnap(resized, [sibling], 20, 'w', limits)
    // 素の吸着なら w=5 になるはずだが minW=10 でクランプされる
    expect(result.rect).toEqual({ x: 10, y: 0, w: 10, h: 20 })
    expect(result.guides).toEqual([{ axis: 'vertical', pos: 15, start: 0, end: 100 }])
  })

  it('しきい値外なら対辺・制御辺とも無変化でガイドも空', () => {
    const resized: Rect = { x: 0, y: 0, w: 50, h: 50 }
    const sibling: Rect = { x: 500, y: 500, w: 50, h: 50 }
    const result = computeResizeSnap(resized, [sibling], 5, 'se', limits)
    expect(result.rect).toEqual(resized)
    expect(result.guides).toEqual([])
  })
})
