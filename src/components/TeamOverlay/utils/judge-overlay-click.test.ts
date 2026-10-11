// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { isMarginClick, shouldClearHighlight, shouldClearSelection } from './judge-overlay-click'
import { SEAT_GRID_CELL_ATTR } from './seat-drag-attrs'

// 属性を付けた親の中の子を返す(クリックはカードの中の子要素に当たる)
const childOf = (attr: string, value: string): HTMLElement => {
  const parent = document.createElement('div')
  parent.setAttribute(attr, value)
  const child = document.createElement('span')
  parent.appendChild(child)
  return child
}

// どの属性も持たない祖先の下の要素
const looseElement = (): HTMLElement => {
  const parent = document.createElement('div')
  const child = document.createElement('span')
  parent.appendChild(child)
  return child
}

describe('isMarginClick', () => {
  it('ラッパー自身に当たったクリックなら true', () => {
    const wrap = document.createElement('div')
    expect(isMarginClick(wrap, wrap)).toBe(true)
  })

  it('ラッパーの中の要素に当たったクリックなら false', () => {
    const wrap = document.createElement('div')
    const panel = document.createElement('div')
    wrap.appendChild(panel)
    expect(isMarginClick(panel, wrap)).toBe(false)
  })
})

describe('shouldClearHighlight', () => {
  it('ヒット席とは別の席をクリックしたら解除する', () => {
    expect(shouldClearHighlight(childOf('data-seat-id', 's2'), 's1')).toBe(true)
  })

  it('座席の外をクリックしたら解除する', () => {
    expect(shouldClearHighlight(looseElement(), 's1')).toBe(true)
  })

  it('ヒット席自身のクリックでは解除しない', () => {
    expect(shouldClearHighlight(childOf('data-seat-id', 's1'), 's1')).toBe(false)
  })

  it('ヒット表示が無ければ何も解除しない', () => {
    expect(shouldClearHighlight(childOf('data-seat-id', 's2'), null)).toBe(false)
    expect(shouldClearHighlight(looseElement(), null)).toBe(false)
  })

  it('ヒット席の id が空文字なら表示が無いのと同じに扱う', () => {
    expect(shouldClearHighlight(childOf('data-seat-id', 's2'), '')).toBe(false)
  })
})

describe('shouldClearSelection', () => {
  it('編集中にセルの外をタップしたら選択を解除する', () => {
    expect(shouldClearSelection(looseElement(), true)).toBe(true)
  })

  it('編集中でもセルの中のタップでは解除しない', () => {
    expect(shouldClearSelection(childOf(SEAT_GRID_CELL_ATTR, '0:0'), true)).toBe(false)
  })

  it('編集中でなければ解除しない', () => {
    expect(shouldClearSelection(looseElement(), false)).toBe(false)
  })
})
