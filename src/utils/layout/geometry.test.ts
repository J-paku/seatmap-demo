import { describe, it, expect } from 'vitest'
import {
  VIEWBOX_W,
  VIEWBOX_H,
  MAX_SCALE,
  clamp,
  toLogical,
  computeCompact,
  computeMinScale,
  zoomAtPoint,
  scaleToLevel,
  levelToScale,
} from './geometry'

describe('clamp', () => {
  it('中間値をそのまま返す', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('下限未満は下限にクランプする', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })

  it('上限超過は上限にクランプする', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })

  it('下限ちょうどはそのまま', () => {
    expect(clamp(0, 0, 10)).toBe(0)
  })

  it('上限ちょうどはそのまま', () => {
    expect(clamp(10, 0, 10)).toBe(10)
  })
})

describe('toLogical', () => {
  it('scale=1・translate=0では画面座標=論理座標', () => {
    expect(toLogical(100, 1, 0)).toBe(100)
  })

  it('translate を差し引いてから scale で割る', () => {
    // (300 - 50) / 0.5 = 500
    expect(toLogical(300, 0.5, 50)).toBe(500)
  })

  it('負の translate も正しく扱う', () => {
    // (100 - (-100)) / 2 = 100
    expect(toLogical(100, 2, -100)).toBe(100)
  })
})

describe('computeCompact', () => {
  it('containerW が0以下なら既定値を返す', () => {
    expect(computeCompact(0, 500)).toEqual({ scale: 0.8, translateX: 0, translateY: 0 })
  })

  it('containerH が0以下なら既定値を返す', () => {
    expect(computeCompact(500, 0)).toEqual({ scale: 0.8, translateX: 0, translateY: 0 })
  })

  it('containerW・containerH 両方が負でも既定値を返す', () => {
    expect(computeCompact(-10, -10)).toEqual({ scale: 0.8, translateX: 0, translateY: 0 })
  })

  it('viewBox と同寸のコンテナは fitScale*0.85 が上限0.65でクランプされる', () => {
    const result = computeCompact(VIEWBOX_W, VIEWBOX_H)
    expect(result.scale).toBe(0.65)
    expect(result.translateX).toBeCloseTo(280, 6)
    expect(result.translateY).toBeCloseTo(201.95, 6)
  })

  it('極小コンテナは fitScale*0.85 が下限0.25でクランプされる', () => {
    const result = computeCompact(100, 100)
    expect(result.scale).toBe(0.25)
    expect(result.translateX).toBeCloseTo(-150, 6)
    expect(result.translateY).toBeCloseTo(-94.25, 6)
  })

  it('クランプされない中間サイズでは fitScale*0.85 をそのまま使う', () => {
    // fitScale = min(800/1600, 577/1154) = 0.5 → compact = 0.425 (0.25〜0.65の範囲内)
    const result = computeCompact(800, 577)
    expect(result.scale).toBeCloseTo(0.425, 6)
    expect(result.translateX).toBeCloseTo(60, 6)
    expect(result.translateY).toBeCloseTo(43.275, 6)
  })
})

describe('computeMinScale', () => {
  it('compact*0.4 が下限0.25を下回る通常サイズでは0.25が勝つ', () => {
    // computeCompact(800,577).scale = 0.425 → 0.425*0.4 = 0.17 < 0.25
    expect(computeMinScale(800, 577)).toBe(0.25)
  })

  it('compact が大きいとき compact*0.4 が下限0.25を上回って勝つ', () => {
    // computeCompact(VIEWBOX_W, VIEWBOX_H).scale = 0.65 → 0.65*0.4 = 0.26 > 0.25
    expect(computeMinScale(VIEWBOX_W, VIEWBOX_H)).toBeCloseTo(0.26, 6)
  })
})

describe('zoomAtPoint', () => {
  it('anchor の論理座標がズーム前後で一致する(基点固定の不変条件)', () => {
    const t = { scale: 1, translateX: 0, translateY: 0 }
    const next = zoomAtPoint(t, 2, 100, 100)
    expect(next).toEqual({ scale: 2, translateX: -100, translateY: -100 })
    // ズーム後も同じ画面座標(100,100)が同じ論理座標を指す
    expect(toLogical(100, next.scale, next.translateX)).toBeCloseTo(
      toLogical(100, t.scale, t.translateX),
      6
    )
  })

  it('既存の transform を持つ状態からも基点固定が成立する', () => {
    const t = { scale: 0.5, translateX: 50, translateY: 20 }
    const next = zoomAtPoint(t, 1, 300, 200)
    expect(next).toEqual({ scale: 1, translateX: -200, translateY: -160 })
    expect(toLogical(300, next.scale, next.translateX)).toBeCloseTo(
      toLogical(300, t.scale, t.translateX),
      6
    )
    expect(toLogical(200, next.scale, next.translateY)).toBeCloseTo(
      toLogical(200, t.scale, t.translateY),
      6
    )
  })

  it('anchor が原点(0,0)でも成立する', () => {
    const t = { scale: 1, translateX: 10, translateY: 10 }
    const next = zoomAtPoint(t, 3, 0, 0)
    // lx = (0-10)/1 = -10, ly = -10
    expect(next).toEqual({ scale: 3, translateX: 30, translateY: 30 })
  })
})

describe('scaleToLevel / levelToScale', () => {
  it('scale=1 は level=0', () => {
    expect(scaleToLevel(1)).toBe(0)
  })

  it('scale=2 は level=1', () => {
    expect(scaleToLevel(2)).toBe(1)
  })

  it('scale=0.5 は level=-1', () => {
    expect(scaleToLevel(0.5)).toBe(-1)
  })

  it('level=0 は scale=1', () => {
    expect(levelToScale(0)).toBe(1)
  })

  it('level=3 は scale=8', () => {
    expect(levelToScale(3)).toBe(8)
  })

  it('往復変換で元の scale に戻る', () => {
    const original = MAX_SCALE
    expect(levelToScale(scaleToLevel(original))).toBeCloseTo(original, 10)
  })
})
