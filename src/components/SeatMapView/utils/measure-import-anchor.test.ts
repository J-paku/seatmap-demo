// @vitest-environment happy-dom
import { afterEach, describe, it, expect, vi } from 'vitest'
import { viewportCenterAnchor } from './measure-import-anchor'
import { SEATMAP_BG_ID } from '@/components/SheetShell'

// 実測が取れないときに返す原典転記の固定値
const FALLBACK = { x: 960, y: 540 }

afterEach(() => {
  vi.restoreAllMocks()
  document.body.replaceChildren()
})

// キャンバス。画面上の矩形は与えた幅・高さに差し替える
const appendCanvas = (width: number, height: number) => {
  const canvas = document.createElement('div')
  canvas.id = SEATMAP_BG_ID
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width, height } as DOMRect)
  document.body.append(canvas)
}

// パンズームの変換層。flag は DOM フックの値(本物は 'true')
const appendLayer = (transform: string, flag = 'true') => {
  const layer = document.createElement('div')
  layer.setAttribute('data-canvas-transform-layer', flag)
  layer.style.transform = transform
  document.body.append(layer)
}

describe('viewportCenterAnchor', () => {
  it('キャンバス矩形の中央を変換層の平行移動と倍率で SVG 座標へ戻す', () => {
    appendCanvas(1000, 600)
    appendLayer('matrix(2, 0, 0, 2, 100, 50)')
    expect(viewportCenterAnchor()).toEqual({ x: 200, y: 125 })
  })

  it('変換が無ければ画面中央をそのまま返す', () => {
    appendCanvas(1000, 600)
    appendLayer('')
    expect(viewportCenterAnchor()).toEqual({ x: 500, y: 300 })
  })

  it('倍率が0と読めたときは1倍として平行移動だけを戻す', () => {
    appendCanvas(1000, 600)
    appendLayer('matrix(0, 0, 0, 0, 100, 50)')
    expect(viewportCenterAnchor()).toEqual({ x: 400, y: 250 })
  })

  it('キャンバスも変換層も無ければ固定値', () => {
    expect(viewportCenterAnchor()).toEqual(FALLBACK)
  })

  it('キャンバスだけ・変換層だけのときも固定値', () => {
    appendCanvas(1000, 600)
    expect(viewportCenterAnchor()).toEqual(FALLBACK)
    document.body.replaceChildren()
    appendLayer('matrix(2, 0, 0, 2, 100, 50)')
    expect(viewportCenterAnchor()).toEqual(FALLBACK)
  })

  it('DOM フックの値が true でない層は変換層と見なさない', () => {
    appendCanvas(1000, 600)
    appendLayer('matrix(2, 0, 0, 2, 100, 50)', 'false')
    expect(viewportCenterAnchor()).toEqual(FALLBACK)
  })

  it('キャンバスの幅か高さが0(未レイアウト)なら固定値', () => {
    appendCanvas(0, 600)
    appendLayer('matrix(2, 0, 0, 2, 100, 50)')
    expect(viewportCenterAnchor()).toEqual(FALLBACK)
    document.body.replaceChildren()
    appendCanvas(1000, 0)
    appendLayer('matrix(2, 0, 0, 2, 100, 50)')
    expect(viewportCenterAnchor()).toEqual(FALLBACK)
  })
})
