import type { GridCell } from '@/utils/layout/seat-grid-draft'

// STEP B2/B3: 座席ドラッグ/ドロップの経路がDOMから直接読み取るdata属性の規約(名前・書き方・読み方)と、
// タッチでドラッグを始める閾値。書く側のコンポーネント(TrashDropZone/DesktopSeatGrid/CompactSeatGrid)と
// 読む側(use-seat-drag・utils/judge-overlay-click.ts)の両方から参照されるため、どちらか一方に属させず
// 独立したutilsに置く

// タッチ: 長押しでドラッグ開始とみなすまでの時間(ms)。§06-2の仕様値
export const TOUCH_LONG_PRESS_MS = 350
// タッチ: 開始前にこれ以上動いたらスクロール優先でキャンセルする距離(px)
export const TOUCH_DRAG_TOLERANCE_PX = 10

// セル番地(row:col)を伝える data 属性名。実セルのDOMは各SeatGridコンポーネントが描く
export const SEAT_GRID_CELL_ATTR = 'data-seat-grid-cell'

// セル番地を data 属性値へ直列化する。セルDOMを描く側がこれを使って属性を付与する
export const formatSeatGridCellAttr = (cell: GridCell): string => `${cell.row}:${cell.col}`

// タッチ経路(use-seat-drag が elementFromPoint で解決する)がこのゾーンを識別するための data 属性名
export const TRASH_DROP_ZONE_ATTR = 'data-trash-drop-zone'

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
