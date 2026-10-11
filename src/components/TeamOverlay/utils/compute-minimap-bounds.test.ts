import { describe, expect, it } from 'vitest'
import type { MinimapArea, MinimapFurniture } from '@/types'
import { boundingWindow, centerOf, cropWindow } from './compute-minimap-bounds'

const area = (x: number, y: number, w: number, h: number): MinimapArea => ({
  idPrefix: 'A',
  x,
  y,
  w,
  h,
  label: '営業部',
  dotColor: '#000000',
})

const furniture = (x: number, y: number, width: number, height: number): MinimapFurniture => ({
  id: 'f1',
  kind: 'facility',
  name: '会議室',
  x,
  y,
  width,
  height,
})

describe('centerOf', () => {
  it('領域の中心座標を返す', () => {
    expect(centerOf(area(10, 20, 40, 60))).toEqual({ x: 30, y: 50 })
  })
})

describe('cropWindow', () => {
  it('viewBox 全域を窓にする', () => {
    expect(cropWindow({ width: 1600, height: 1154 })).toEqual({
      x: 0,
      y: 0,
      w: 1600,
      h: 1154,
    })
  })

  it('辺が 1 に満たない viewBox でも窓の辺は 1 を下回らない', () => {
    expect(cropWindow({ width: 0.5, height: 0.25 })).toEqual({
      x: -0.5,
      y: -0.75,
      w: 1,
      h: 1,
    })
  })
})

describe('boundingWindow', () => {
  it('描く対象が1件も無ければ 1×1 の退化矩形を返す', () => {
    expect(boundingWindow([], [], null)).toEqual({ x: 0, y: 0, w: 1, h: 1 })
  })

  it('小さい対象には最低 24 の余白を四方へ足す', () => {
    expect(boundingWindow([area(100, 200, 50, 40)], [], null)).toEqual({
      x: 76,
      y: 176,
      w: 98,
      h: 88,
    })
  })

  it('大きい対象には辺の 4% の余白を足す', () => {
    expect(boundingWindow([area(0, 0, 1000, 2000)], [], null)).toEqual({
      x: -40,
      y: -80,
      w: 1080,
      h: 2160,
    })
  })

  it('領域・家具・現在チームをまとめて囲む', () => {
    expect(
      boundingWindow(
        [area(100, 100, 100, 100)],
        [furniture(300, 50, 100, 100)],
        area(0, 400, 50, 50)
      )
    ).toEqual({ x: -24, y: 26, w: 448, h: 448 })
  })
})
