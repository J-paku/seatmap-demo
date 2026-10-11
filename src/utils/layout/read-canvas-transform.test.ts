// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest'
import { SEATMAP_BG_ID } from '@/utils/seatmap-bg-id'
import { findCanvas, findLayer, readTransform } from './read-canvas-transform'

// getComputedStyle は文書に繋がった要素でしか inline style を返さないので、毎回 body へ足す
const attach = (transform: string): HTMLElement => {
  const el = document.createElement('div')
  el.style.transform = transform
  document.body.appendChild(el)
  return el
}

describe('readTransform', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('変換行列から倍率と平行移動を読む', () => {
    expect(readTransform(attach('matrix(2, 0, 0, 2, 10, 20)'))).toEqual({
      scale: 2,
      tx: 10,
      ty: 20,
    })
  })

  it('倍率が0の行列は倍率1として読み、平行移動はそのまま', () => {
    expect(readTransform(attach('matrix(0, 0, 0, 0, 5, 6)'))).toEqual({
      scale: 1,
      tx: 5,
      ty: 6,
    })
  })

  it('変換が無い要素は恒等変換として読む', () => {
    expect(readTransform(attach(''))).toEqual({ scale: 1, tx: 0, ty: 0 })
  })
})

describe('findLayer', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('data-canvas-transform-layer="true" の要素を返す', () => {
    const layer = document.createElement('div')
    layer.setAttribute('data-canvas-transform-layer', 'true')
    document.body.appendChild(layer)
    expect(findLayer()).toBe(layer)
  })

  it('属性値が true でない要素は返さない', () => {
    const other = document.createElement('div')
    other.setAttribute('data-canvas-transform-layer', 'false')
    document.body.appendChild(other)
    expect(findLayer()).toBeNull()
  })

  it('該当する要素が無ければ null', () => {
    expect(findLayer()).toBeNull()
  })
})

describe('findCanvas', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('座席マップ背景の id を持つ要素を返す', () => {
    const canvas = document.createElement('div')
    canvas.id = SEATMAP_BG_ID
    document.body.appendChild(canvas)
    expect(findCanvas()).toBe(canvas)
  })

  it('該当する要素が無ければ null', () => {
    expect(findCanvas()).toBeNull()
  })
})
