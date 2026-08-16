import { describe, it, expect } from 'vitest'
import { edgePanDelta } from './edge-pan'

// rect: left=0, top=0, right=400, bottom=300 (幅400×高さ300)
const rect = { left: 0, top: 0, right: 400, bottom: 300 }

describe('edgePanDelta', () => {
  it('中央付近(ゾーン外)では null を返す', () => {
    expect(edgePanDelta({ x: 200, y: 150 }, rect)).toBeNull()
  })

  it('ゾーン境界ちょうど(56px)では null を返す(ゾーンは56px未満で発火)', () => {
    expect(edgePanDelta({ x: 56, y: 150 }, rect)).toBeNull()
  })

  it('ゾーン境界の内側1pxでは発火する', () => {
    const result = edgePanDelta({ x: 55, y: 150 }, rect)
    expect(result).not.toBeNull()
    expect(result?.dx).toBeGreaterThan(0)
  })

  it('左端に密着(x=0)すると dx は正の最大速度になる', () => {
    const result = edgePanDelta({ x: 0, y: 150 }, rect)
    expect(result).toEqual({ dx: 18, dy: 0 })
  })

  it('右端に密着(x=400)すると dx は負の最大速度になる', () => {
    const result = edgePanDelta({ x: 400, y: 150 }, rect)
    expect(result).toEqual({ dx: -18, dy: 0 })
  })

  it('上端に密着(y=0)すると dy は正の最大速度になる', () => {
    const result = edgePanDelta({ x: 200, y: 0 }, rect)
    expect(result).toEqual({ dx: 0, dy: 18 })
  })

  it('下端に密着(y=300)すると dy は負の最大速度になる', () => {
    const result = edgePanDelta({ x: 200, y: 300 }, rect)
    expect(result).toEqual({ dx: 0, dy: -18 })
  })

  it('左端からゾーン半分(28px)の深さでは速度も半分(9px)になる(線形)', () => {
    // fromLeft = 56 - 28 = 28, depth比 28/56=0.5 → speed = 0.5*18 = 9
    const result = edgePanDelta({ x: 28, y: 150 }, rect)
    expect(result?.dx).toBeCloseTo(9, 5)
  })

  it('矩形の外側(負の深さを超えて突き抜けた場合)も最大速度でクランプされる', () => {
    // 矩形の左外側にポインタがある場合、fromLeft は 56 を超える(56 - (負数))
    const result = edgePanDelta({ x: -100, y: 150 }, rect)
    expect(result).toEqual({ dx: 18, dy: 0 })
  })

  it('角(左上)では dx・dy が同時に発火する', () => {
    const result = edgePanDelta({ x: 10, y: 10 }, rect)
    expect(result).not.toBeNull()
    expect(result?.dx).toBeGreaterThan(0)
    expect(result?.dy).toBeGreaterThan(0)
  })

  it('角(右下)では dx・dy が同時に負方向で発火する', () => {
    const result = edgePanDelta({ x: 390, y: 290 }, rect)
    expect(result).not.toBeNull()
    expect(result?.dx).toBeLessThan(0)
    expect(result?.dy).toBeLessThan(0)
  })

  it('横幅が56px未満の矩形では左右のゾーンが重なり、中心付近でも両方向のfromが正になる', () => {
    // rect幅30なので中心(x=15)では fromLeft = 56-15=41, fromRight = 56-15=41 で相殺されない
    // 実装は fromLeft優先(else if)なので dx は正(左)方向のみが採用される
    const narrowRect = { left: 0, top: 0, right: 30, bottom: 300 }
    const result = edgePanDelta({ x: 15, y: 150 }, narrowRect)
    expect(result).not.toBeNull()
    expect(result?.dx).toBeGreaterThan(0)
  })
})
