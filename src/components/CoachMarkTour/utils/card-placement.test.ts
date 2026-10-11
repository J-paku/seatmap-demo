import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getCardPlacementStyle } from './card-placement'

// node 環境に DOMRect のコンストラクタは無いので、型を満たすプレーンオブジェクトで渡す
const makeRect = (left: number, top: number, width: number, height: number): DOMRect => ({
  x: left,
  y: top,
  width,
  height,
  left,
  top,
  right: left + width,
  bottom: top + height,
  toJSON: () => ({}),
})

// 画面は幅 1000・高さ 800。すき間 14・必要な余白 180・端の寄せ 180 の前提で値を組む
beforeEach(() => {
  vi.stubGlobal('window', { innerWidth: 1000, innerHeight: 800 })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getCardPlacementStyle', () => {
  it('下の余白がちょうど足りれば、対象の下端からすき間を空けて下に置く', () => {
    // 下の余白 = 800 - 606 - 14 = 180
    expect(getCardPlacementStyle(makeRect(400, 556, 200, 50))).toEqual({
      left: 500,
      top: 620,
      transform: 'translateX(-50%)',
    })
  })

  it('下の余白が 1px 足りなければ、上の余白がちょうど足りる時は対象の上端からすき間を空けて上に置く', () => {
    // 下の余白 = 800 - 607 - 14 = 179、上の余白 = 194 - 14 = 180
    expect(getCardPlacementStyle(makeRect(400, 194, 200, 413))).toEqual({
      left: 500,
      top: 180,
      transform: 'translate(-50%, -100%)',
    })
  })

  it('上下どちらの余白も 1px 足りなければ、対象の上端から内側へ垂らす', () => {
    // 下の余白 = 800 - 607 - 14 = 179、上の余白 = 193 - 14 = 179
    expect(getCardPlacementStyle(makeRect(400, 193, 200, 414))).toEqual({
      left: 500,
      top: 207,
      transform: 'translateX(-50%)',
    })
  })

  it('内側へ垂らす時、画面が低ければカードの必要分を下端から確保した位置で止める', () => {
    vi.stubGlobal('window', { innerWidth: 1000, innerHeight: 300 })
    // 上端 + すき間 = 164 だが、300 - 180 = 120 で止める
    expect(getCardPlacementStyle(makeRect(400, 150, 200, 100))).toEqual({
      left: 500,
      top: 120,
      transform: 'translateX(-50%)',
    })
  })

  it('対象が左端に寄っていれば、カードの中心を左端から 180 の位置まで内側へ寄せる', () => {
    expect(getCardPlacementStyle(makeRect(0, 100, 100, 50)).left).toBe(180)
  })

  it('対象が右端に寄っていれば、カードの中心を右端から 180 の位置まで内側へ寄せる', () => {
    expect(getCardPlacementStyle(makeRect(900, 100, 100, 50)).left).toBe(820)
  })
})
