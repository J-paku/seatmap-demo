import { SEAT_GRID_CELL_ATTR, TRASH_DROP_ZONE_ATTR } from './seat-drag-attrs'
import type { GridCell } from '@/utils/layout/seat-grid-draft'

// 座席ドラッグ(use-seat-drag)のタッチの閾値と、DOM からドラッグの対象を解決する関数

// タッチ: 長押しでドラッグ開始とみなすまでの時間(ms)。§06-2の仕様値
export const TOUCH_LONG_PRESS_MS = 350
// タッチ: 開始前にこれ以上動いたらスクロール優先でキャンセルする距離(px)
export const TOUCH_DRAG_TOLERANCE_PX = 10

const parseSeatGridCellAttr = (value: string | undefined): GridCell | null => {
  if (!value) return null
  const [rowText, colText] = value.split(':')
  const row = Number(rowText)
  const col = Number(colText)
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null
  return { row, col }
}

// 任意の子要素から祖先を遡ってセル番地を解決する(pointermove/dragover/elementFromPointの結果に使う)
export const resolveCellFromElement = (el: Element | null): GridCell | null => {
  const cellEl = el?.closest<HTMLElement>(`[${SEAT_GRID_CELL_ATTR}]`)
  return parseSeatGridCellAttr(cellEl?.dataset.seatGridCell)
}

// 座席idは既存のサイト共通規約(`data-seat-id`)から読む。同じ概念の判定基準をここで作らない
export const resolveSeatIdFromElement = (el: Element | null): string | null => {
  const seatEl = el?.closest<HTMLElement>('[data-seat-id]')
  return seatEl?.dataset.seatId ?? null
}

// ゴミ箱ゾーン(TrashDropZone)の上に乗っているかをdata属性から判定する。
// TrashDropZoneはSeatMapPortal経由でbody直下に描かれるためReactツリーを跨げず、
// elementFromPointで得たDOMから直接判定する必要がある
export const resolveIsOverTrashZone = (el: Element | null): boolean =>
  !!el?.closest(`[${TRASH_DROP_ZONE_ATTR}]`)
