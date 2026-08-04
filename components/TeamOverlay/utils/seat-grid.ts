import type { Seat } from '@/types'
import type { SeatGrid } from '../type'

// 座席グリッドの寸法定数と、絶対座標から行列を起こす計算

export const DESKTOP_SEAT_CARD_WIDTH_PX = 180
export const DESKTOP_SEAT_GAP_PX = 10

export const COMPACT_VISIBLE_COLS = 6
export const COMPACT_SEAT_GAP_PX = 6
export const COMPACT_SEAT_MIN_HEIGHT_PX = 96
// グリッド左右パディング。見出し側もモバイル時だけこの値を足して縦線を揃える
export const COMPACT_SIDE_PADDING_PX = 11

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
