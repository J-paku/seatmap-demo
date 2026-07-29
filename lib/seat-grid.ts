import type { Employee, PresenceStatus, Seat } from './types'

// TeamOverlay の座席グリッド共通定義。Desktop / Compact 両実装がここだけを共有する

// 人の状態色(10-main-interactions の正本表・4種のみ保持)
export const SEAT_STATUS_COLOR: Record<PresenceStatus, string> = {
  present: '#16a34a',
  meeting: '#2563eb',
  out: '#d97706',
  vacation: '#6b7280',
}

// 検索ヒットの琥珀色(実装は Desktop / Compact で別だが色は共通)
export const SEAT_HIT_AMBER = '#e9a93d'

export const DESKTOP_SEAT_CARD_WIDTH_PX = 180
export const DESKTOP_SEAT_CARD_HEIGHT_PX = 88
export const DESKTOP_SEAT_GAP_PX = 10

export const COMPACT_VISIBLE_COLS = 6
export const COMPACT_SEAT_GAP_PX = 6
export const COMPACT_SEAT_MIN_HEIGHT_PX = 96
// グリッド左右パディング。SeatLayoutHeader 側もモバイル時だけこの値を足して縦線を揃える
export const COMPACT_SIDE_PADDING_PX = 11

export type PositionedSeat = {
  seat: Seat
  row: number
  col: number
}

export type SeatGrid = {
  // 行→列でソート済み。Compact はこれだけを map する
  positionedSeats: PositionedSeat[]
  // Desktop は row×col の全走査でここを引く
  seatByGridCell: Map<string, Seat>
  rows: number
  cols: number
}

// 両グリッドが受け取る共通 props。描画・入力・スクロール戦略だけが別実装になる
export type SeatGridProps = {
  grid: SeatGrid
  employeeById: Map<string, Employee>
  presenceMap: Map<string, PresenceStatus>
  teamName: string
  teamColor: string
  loading: boolean
  highlightSeatId: string | null
  onSeatClick: (seatId: string) => void
  onClearHighlight?: () => void
}

export const gridCellKey = (row: number, col: number): string => `${row}:${col}`

// 座標の近いものを1本の軸へまとめる(編集で多少ずれても同じ行/列として扱う)
const clusterAxis = (values: number[], tolerance: number): number[] => {
  const sorted = [...values].sort((a, b) => a - b)
  const centers: number[] = []
  for (const v of sorted) {
    if (centers.length === 0 || v - centers[centers.length - 1] > tolerance) centers.push(v)
  }
  return centers
}

const nearestIndex = (centers: number[], v: number): number => {
  let best = 0
  for (let i = 1; i < centers.length; i += 1) {
    if (Math.abs(v - centers[i]) < Math.abs(v - centers[best])) best = i
  }
  return best
}

// 座席データはフロア絶対座標しか持たないため、ここで行列インデックスを起こす
export const buildSeatGrid = (seats: Seat[]): SeatGrid => {
  if (seats.length === 0) return { positionedSeats: [], seatByGridCell: new Map(), rows: 0, cols: 0 }

  const avgW = seats.reduce((sum, s) => sum + s.width, 0) / seats.length
  const avgH = seats.reduce((sum, s) => sum + s.height, 0) / seats.length
  const colCenters = clusterAxis(seats.map((s) => s.x), avgW * 0.6)
  const rowCenters = clusterAxis(seats.map((s) => s.y), avgH * 0.6)

  const positionedSeats = seats
    .map((seat) => ({ seat, row: nearestIndex(rowCenters, seat.y), col: nearestIndex(colCenters, seat.x) }))
    .sort((a, b) => a.row - b.row || a.col - b.col)

  const seatByGridCell = new Map(positionedSeats.map((p) => [gridCellKey(p.row, p.col), p.seat]))
  return { positionedSeats, seatByGridCell, rows: rowCenters.length, cols: colCenters.length }
}

// Compact は姓のみ表示(空白区切りの先頭)
export const getCompactNameLabel = (name: string): string => {
  const head = name.trim().split(/\s+/)[0]
  return head.length > 0 ? head : name
}

// Compact の氏名サイズは 8〜13px 可変。ASCII 9 文字以上 → 8px / 和名 5 文字以上 → 12px
export const compactNameFontSize = (label: string): number => {
  if (/^[\x20-\x7e]+$/.test(label)) return label.length >= 9 ? 8 : 13
  return label.length >= 5 ? 12 : 13
}
