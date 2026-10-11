// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import {
  SEAT_GRID_CELL_ATTR,
  TRASH_DROP_ZONE_ATTR,
  formatSeatGridCellAttr,
} from './seat-drag-attrs'

// 属性を付けた親の中に子を1つ置き、子から closest で親を辿れるかを見る(ドラッグ経路の解決と同じ形)
const mountWithChild = (attr: string, value: string): { parent: HTMLElement; child: Element } => {
  const parent = document.createElement('div')
  parent.setAttribute(attr, value)
  const child = document.createElement('span')
  parent.appendChild(child)
  return { parent, child }
}

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
