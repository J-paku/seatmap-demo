import type { Seat } from '@/types'

// STEP D2: rotation(座席の向き)から方角情報を導く唯一の変換元。
// SeatDirectionMarker(帯を出す辺)とEditSeatCell(aria-labelの文字)の両方がここを参照し、
// 同じ概念の判定基準を二重に持たない。
// 方角の対応は画面座標系(y下向き): 右=東=90 / 下=南=0 / 左=西=270 / 上=北=180
export type SeatCompassDirection = 'north' | 'south' | 'east' | 'west'

export const SEAT_DIRECTION: Record<Seat['rotation'], SeatCompassDirection> = {
  0: 'south',
  90: 'east',
  180: 'north',
  270: 'west',
}

const SEAT_DIRECTION_LABEL: Record<SeatCompassDirection, string> = {
  north: '北',
  south: '南',
  east: '東',
  west: '西',
}

// aria-label用の「◯向き」を返す
export const seatDirectionLabel = (rotation: Seat['rotation']): string =>
  `${SEAT_DIRECTION_LABEL[SEAT_DIRECTION[rotation]]}向き`
