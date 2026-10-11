// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import {
  SEAT_GRID_CELL_ATTR,
  TOUCH_DRAG_TOLERANCE_PX,
  TOUCH_LONG_PRESS_MS,
  TRASH_DROP_ZONE_ATTR,
  formatSeatGridCellAttr,
  resolveCellFromElement,
  resolveIsOverTrashZone,
  resolveSeatIdFromElement,
} from './seat-drag-attrs'

// 属性を付けた親の中に子を1つ置き、子から closest で親を辿れるかを見る(ドラッグ経路の解決と同じ形)
const mountWithChild = (attr: string, value: string): { parent: HTMLElement; child: Element } => {
  const parent = document.createElement('div')
  parent.setAttribute(attr, value)
  const child = document.createElement('span')
  parent.appendChild(child)
  return { parent, child }
}

// 属性を付けた親の中の子を返す(ドラッグ経路は子要素から祖先を辿る)
const childOf = (attr: string, value: string): Element => mountWithChild(attr, value).child

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

describe('formatSeatGridCellAttr', () => {
  it('セル番地を「行:列」の文字列にする', () => {
    expect(formatSeatGridCellAttr({ row: 2, col: 5 })).toBe('2:5')
    expect(formatSeatGridCellAttr({ row: 0, col: 0 })).toBe('0:0')
  })
})

describe('SEAT_GRID_CELL_ATTR', () => {
  it('付けた値は dataset.seatGridCell で読める(ドラッグ経路はこの名前で読む)', () => {
    const value = formatSeatGridCellAttr({ row: 1, col: 3 })
    const { parent } = mountWithChild(SEAT_GRID_CELL_ATTR, value)
    expect(parent.dataset.seatGridCell).toBe('1:3')
  })

  it('セルの中の子要素から属性セレクタで祖先のセルを辿れる', () => {
    const { parent, child } = mountWithChild(SEAT_GRID_CELL_ATTR, '0:0')
    expect(child.closest(`[${SEAT_GRID_CELL_ATTR}]`)).toBe(parent)
  })
})

describe('TRASH_DROP_ZONE_ATTR', () => {
  it('ゾーンの中の子要素から属性セレクタでゴミ箱ゾーンを辿れる', () => {
    const { parent, child } = mountWithChild(TRASH_DROP_ZONE_ATTR, 'true')
    expect(child.closest(`[${TRASH_DROP_ZONE_ATTR}]`)).toBe(parent)
  })

  it('セルとゴミ箱ゾーンを取り違えない', () => {
    const cell = mountWithChild(SEAT_GRID_CELL_ATTR, '0:0')
    const trash = mountWithChild(TRASH_DROP_ZONE_ATTR, 'true')
    expect(cell.child.closest(`[${TRASH_DROP_ZONE_ATTR}]`)).toBeNull()
    expect(trash.child.closest(`[${SEAT_GRID_CELL_ATTR}]`)).toBeNull()
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

  it('書く側の formatSeatGridCellAttr で付けた値をそのまま読み戻せる', () => {
    const value = formatSeatGridCellAttr({ row: 4, col: 1 })
    expect(resolveCellFromElement(childOf(SEAT_GRID_CELL_ATTR, value))).toEqual({ row: 4, col: 1 })
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
