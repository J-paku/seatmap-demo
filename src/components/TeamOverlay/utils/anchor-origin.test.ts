import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { anchorTransformOrigin } from './anchor-origin'

// DOMRect は node 環境にコンストラクタが無いので、型を満たすプレーンオブジェクトで作る
const makeRect = (left: number, top: number, width: number, height: number): DOMRect => ({
  x: left,
  y: top,
  width,
  height,
  top,
  left,
  right: left + width,
  bottom: top + height,
  toJSON: () => ({}),
})

describe('anchorTransformOrigin', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { innerWidth: 1000, innerHeight: 500 })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('矩形の中心が画面のどこにあるかを百分率の transform-origin で返す', () => {
    // 中心 x = 400 + 200 / 2 = 500 → 50% / 中心 y = 100 + 100 / 2 = 150 → 30%
    expect(anchorTransformOrigin(makeRect(400, 100, 200, 100))).toBe('50% 30%')
  })

  it('左上の端に寄った矩形は 8% で止める', () => {
    expect(anchorTransformOrigin(makeRect(0, 0, 20, 10))).toBe('8% 8%')
  })

  it('右下の端に寄った矩形は 92% で止める', () => {
    expect(anchorTransformOrigin(makeRect(980, 490, 20, 10))).toBe('92% 92%')
  })

  it('境界ちょうどの 8% と 92% はそのまま返す', () => {
    // 中心 x = 70 + 20 / 2 = 80 → 8% / 中心 y = 455 + 10 / 2 = 460 → 92%
    expect(anchorTransformOrigin(makeRect(70, 455, 20, 10))).toBe('8% 92%')
  })
})
