import { boundingBoxOf, rectOf } from './rect'
import type { Rect } from './rect'
import type { Seat } from '@/types'

// 07-admin-edit: チーム内グリッドリファクと、その結果に合わせた area の自動fit

// 座席既定サイズ(action model・グリッドリファク双方で使用)
export const DEFAULT_SEAT_WIDTH = 105
export const DEFAULT_SEAT_HEIGHT = 75

// チーム内グリッドリファクのパラメータ(viewBox px)
export const RELAYOUT_PADDING = 20
export const RELAYOUT_COL_GAP = 18
const RELAYOUT_ROW_GAP = 20
const AREA_MIN_W = 200
const AREA_MIN_H = 100
// area fit 用パディング(座席バウンディングボックス+20)
const FIT_PADDING = 20

// y→x 順ソート(グリッドリファク用)
export const sortSeatsForRelayout = (seats: Seat[]): Seat[] =>
  [...seats].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y))

// グリッドリファク後の座席配列(area 左上基準・パディング込み)
export const relayoutSeatsInGrid = (seats: Seat[], area: Rect, rows: number, cols: number): Seat[] => {
  const originX = area.x + RELAYOUT_PADDING
  const originY = area.y + RELAYOUT_PADDING
  return sortSeatsForRelayout(seats).map((seat, i) => ({
    ...seat,
    x: originX + (i % cols) * (DEFAULT_SEAT_WIDTH + RELAYOUT_COL_GAP),
    y: originY + Math.floor(i / cols) * (DEFAULT_SEAT_HEIGHT + RELAYOUT_ROW_GAP),
    width: DEFAULT_SEAT_WIDTH,
    height: DEFAULT_SEAT_HEIGHT,
  }))
}

// リファク後座席のバウンディングボックス+パディング20→最小200×100 でクランプした自動fit area
export const fitAreaToSeats = (seats: Seat[], fallback: Rect): Rect => {
  const bb = boundingBoxOf(seats.map((s) => rectOf(s)))
  if (!bb) return fallback
  return {
    x: bb.x - FIT_PADDING,
    y: bb.y - FIT_PADDING,
    w: Math.max(bb.w + FIT_PADDING * 2, AREA_MIN_W),
    h: Math.max(bb.h + FIT_PADDING * 2, AREA_MIN_H),
  }
}
