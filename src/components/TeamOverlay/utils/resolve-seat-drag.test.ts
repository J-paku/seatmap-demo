// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import {
  TOUCH_DRAG_TOLERANCE_PX,
  TOUCH_LONG_PRESS_MS,
  resolveCellFromElement,
  resolveIsOverTrashZone,
  resolveSeatIdFromElement,
} from './resolve-seat-drag'
import { SEAT_GRID_CELL_ATTR, TRASH_DROP_ZONE_ATTR } from './seat-drag-attrs'

// 属性を付けた親の中に子を1つ置き、子を返す(ドラッグ経路は子要素から祖先を辿る)
const childOf = (attr: string, value: string): Element => {
  const parent = document.createElement('div')
  parent.setAttribute(attr, value)
  const child = document.createElement('span')
  parent.appendChild(child)
  return child
}

// どの属性も持たない祖先の下の要素
const looseElement = (): Element => {
  const parent = document.createElement('div')
  const child = document.createElement('span')
  parent.appendChild(child)
  return child
}

describe('タッチの閾値', () => {
  it('長押しは 350ms でドラッグ開始とみなす', () => {
    expect(TOUCH_LONG_PRESS_MS).toBe(350)
  })

  it('開始前に 10px を超えて動いたらスクロールを優先する', () => {
    expect(TOUCH_DRAG_TOLERANCE_PX).toBe(10)
  })
})

describe('resolveCellFromElement', () => {
  it('祖先のセルの「行:列」をセル番地として読む', () => {
    expect(resolveCellFromElement(childOf(SEAT_GRID_CELL_ATTR, '2:5'))).toEqual({ row: 2, col: 5 })
  })

  it('属性を付けた要素自身からも読む', () => {
    const cell = document.createElement('div')
    cell.setAttribute(SEAT_GRID_CELL_ATTR, '0:0')
    expect(resolveCellFromElement(cell)).toEqual({ row: 0, col: 0 })
  })

  it('要素が無ければ null', () => {
    expect(resolveCellFromElement(null)).toBeNull()
  })

  it('セルの外の要素なら null', () => {
    expect(resolveCellFromElement(looseElement())).toBeNull()
  })

  it('属性の値が空なら null', () => {
    expect(resolveCellFromElement(childOf(SEAT_GRID_CELL_ATTR, ''))).toBeNull()
  })

  it('行か列のどちらかが整数でなければ null', () => {
    expect(resolveCellFromElement(childOf(SEAT_GRID_CELL_ATTR, 'a:1'))).toBeNull()
    expect(resolveCellFromElement(childOf(SEAT_GRID_CELL_ATTR, '1:b'))).toBeNull()
    expect(resolveCellFromElement(childOf(SEAT_GRID_CELL_ATTR, '1.5:2'))).toBeNull()
    expect(resolveCellFromElement(childOf(SEAT_GRID_CELL_ATTR, '1'))).toBeNull()
  })
})

describe('resolveSeatIdFromElement', () => {
  it('祖先の data-seat-id を座席 id として読む', () => {
    expect(resolveSeatIdFromElement(childOf('data-seat-id', 'seat-07'))).toBe('seat-07')
  })

  it('要素が無ければ null', () => {
    expect(resolveSeatIdFromElement(null)).toBeNull()
  })

  it('座席の外の要素なら null', () => {
    expect(resolveSeatIdFromElement(looseElement())).toBeNull()
  })
})

describe('resolveIsOverTrashZone', () => {
  it('ゴミ箱ゾーンの中の要素なら true', () => {
    expect(resolveIsOverTrashZone(childOf(TRASH_DROP_ZONE_ATTR, 'true'))).toBe(true)
  })

  it('ゴミ箱ゾーンの外の要素なら false', () => {
    expect(resolveIsOverTrashZone(looseElement())).toBe(false)
  })

  it('セルの中に居てもゴミ箱ゾーンとは取り違えない', () => {
    expect(resolveIsOverTrashZone(childOf(SEAT_GRID_CELL_ATTR, '0:0'))).toBe(false)
  })

  it('要素が無ければ false', () => {
    expect(resolveIsOverTrashZone(null)).toBe(false)
  })
})
