import type { GridCell } from '@/utils/seat-grid-draft'

// STEP B2/B3: 座席ドラッグ/ドロップの経路がDOMから直接読み取るdata属性名。
// フック(use-seat-drag)とコンポーネント(TrashDropZone/DesktopSeatGrid/CompactSeatGrid)の
// 両側から参照されるため、どちらか一方に属させず独立したutilsに置く

// セル番地(row:col)を伝える data 属性名。実セルのDOMは各SeatGridコンポーネントが描く
export const SEAT_GRID_CELL_ATTR = 'data-seat-grid-cell'

// セル番地を data 属性値へ直列化する。セルDOMを描く側がこれを使って属性を付与する
export const formatSeatGridCellAttr = (cell: GridCell): string => `${cell.row}:${cell.col}`

// タッチ経路(use-seat-drag が elementFromPoint で解決する)がこのゾーンを識別するための data 属性名
export const TRASH_DROP_ZONE_ATTR = 'data-trash-drop-zone'
