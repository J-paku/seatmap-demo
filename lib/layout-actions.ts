// 07-admin-edit: レイアウト編集アクションモデル(純粋リデューサー+衝突判定+スナップ計算)
import type { Facility, Seat, SeatLayout, Team } from './types'

// 座席既定サイズ(action model・グリッドリファク双方で使用)
export const DEFAULT_SEAT_WIDTH = 105
export const DEFAULT_SEAT_HEIGHT = 75

// チーム内グリッドリファクのパラメータ(viewBox px)
const RELAYOUT_PADDING = 20
const RELAYOUT_COL_GAP = 18
const RELAYOUT_ROW_GAP = 20
const AREA_MIN_W = 200
const AREA_MIN_H = 100
// team-relayout の area fit 用パディング(座席バウンディングボックス+20)
const FIT_PADDING = 20

export type Rect = { x: number; y: number; w: number; h: number }

export type LayoutAction =
  | { type: 'seat-move'; seatId: string; x: number; y: number }
  | { type: 'seat-add'; teamId: string; x?: number; y?: number }
  | { type: 'seat-delete'; seatId: string }
  | { type: 'seat-assign'; seatId: string; teamId: string }
  | { type: 'seat-swap'; fromSeatId: string; toSeatId: string }
  | { type: 'team-move'; teamId: string; x: number; y: number }
  | { type: 'team-relayout'; teamId: string; rows: number; cols: number }

// 対象オブジェクトの矩形(rotation は判定に加味しない=AABB)
export const rectOf = (o: { x: number; y: number; width: number; height: number }): Rect => ({
  x: o.x,
  y: o.y,
  w: o.width,
  h: o.height,
})

// 2矩形の交差判定(接触=非交差)
export const rectsIntersect = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

// 点(座標)が矩形内部にあるか
export const pointInRect = (px: number, py: number, r: Rect): boolean =>
  px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h

// 次の座席id(既存最大連番+1。id形式は 'seat-<n>' を想定し非マッチは無視)
const nextSeatId = (seats: Seat[]): string => {
  let max = 0
  for (const s of seats) {
    const m = /^seat-(\d+)$/.exec(s.id)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `seat-${max + 1}`
}

// y→x 順ソート(グリッドリファク用)
const sortSeatsForRelayout = (seats: Seat[]): Seat[] =>
  [...seats].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y))

// 座席配列のバウンディングボックス
const boundingBox = (seats: Seat[]): Rect | null => {
  if (seats.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const s of seats) {
    minX = Math.min(minX, s.x)
    minY = Math.min(minY, s.y)
    maxX = Math.max(maxX, s.x + s.width)
    maxY = Math.max(maxY, s.y + s.height)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

// team-relayout: グリッドリファク後の座席配列(area 左上基準・パディング込み)
export const relayoutSeatsInGrid = (
  seats: Seat[],
  area: Rect,
  rows: number,
  cols: number
): Seat[] => {
  const sorted = sortSeatsForRelayout(seats)
  const originX = area.x + RELAYOUT_PADDING
  const originY = area.y + RELAYOUT_PADDING
  return sorted.map((seat, i) => {
    const row = Math.floor(i / cols)
    const col = i % cols
    return {
      ...seat,
      x: originX + col * (DEFAULT_SEAT_WIDTH + RELAYOUT_COL_GAP),
      y: originY + row * (DEFAULT_SEAT_HEIGHT + RELAYOUT_ROW_GAP),
      width: DEFAULT_SEAT_WIDTH,
      height: DEFAULT_SEAT_HEIGHT,
    }
  })
}

// リファク後座席のバウンディングボックス+パディング20→最小200×100 でクランプした自動fit area
export const fitAreaToSeats = (seats: Seat[], fallback: Rect): Rect => {
  const bb = boundingBox(seats)
  if (!bb) return fallback
  const x0 = bb.x - FIT_PADDING
  const y0 = bb.y - FIT_PADDING
  const w = Math.max(bb.w + FIT_PADDING * 2, AREA_MIN_W)
  const h = Math.max(bb.h + FIT_PADDING * 2, AREA_MIN_H)
  return { x: x0, y: y0, w, h }
}

// viewBox 全域クランプ(ドラッグ中常時)
export const clampRectToViewBox = (r: Rect, viewW: number, viewH: number): Rect => ({
  x: Math.min(Math.max(r.x, 0), viewW - r.w),
  y: Math.min(Math.max(r.y, 0), viewH - r.h),
  w: r.w,
  h: r.h,
})

// ── 衝突規則(発行前検証。違反はリデューサーに到達させない) ──────────

// Team area 同士の重なり判定(対象チーム自身は除外)
export const teamAreaOverlaps = (teams: Team[], targetTeamId: string, candidate: Rect): boolean =>
  teams.some((t) => t.id !== targetTeamId && rectsIntersect(rectOf({ ...t.area, width: t.area.w, height: t.area.h }), candidate))

// 座席と Facility の重なり判定
export const seatOverlapsFacility = (facilities: Facility[], candidate: Rect): boolean =>
  facilities.some((f) => rectsIntersect(rectOf(f), candidate))

// ── リデューサー本体(純粋関数。副作用なし) ──────────────────────

export const applyLayoutAction = (layout: SeatLayout, action: LayoutAction): SeatLayout => {
  switch (action.type) {
    case 'seat-move': {
      const seat = layout.seats.find((s) => s.id === action.seatId)
      if (!seat) return layout
      return {
        ...layout,
        seats: layout.seats.map((s) => (s.id === action.seatId ? { ...s, x: action.x, y: action.y } : s)),
      }
    }
    case 'seat-add': {
      const team = layout.teams.find((t) => t.id === action.teamId)
      if (!team) return layout
      const teamSeats = layout.seats.filter((s) => s.teamId === action.teamId)
      let x = action.x
      let y = action.y
      if (x === undefined || y === undefined) {
        const last = sortSeatsForRelayout(teamSeats)[teamSeats.length - 1]
        if (last) {
          x = last.x + last.width + RELAYOUT_COL_GAP
          y = last.y
        } else {
          x = team.area.x + RELAYOUT_PADDING
          y = team.area.y + RELAYOUT_PADDING
        }
      }
      const newSeat: Seat = {
        id: nextSeatId(layout.seats),
        teamId: action.teamId,
        x,
        y,
        width: DEFAULT_SEAT_WIDTH,
        height: DEFAULT_SEAT_HEIGHT,
        rotation: 0,
        employeeId: null,
      }
      return { ...layout, seats: [...layout.seats, newSeat] }
    }
    case 'seat-delete': {
      if (!layout.seats.some((s) => s.id === action.seatId)) return layout
      return { ...layout, seats: layout.seats.filter((s) => s.id !== action.seatId) }
    }
    case 'seat-assign': {
      const seat = layout.seats.find((s) => s.id === action.seatId)
      if (!seat) return layout
      return {
        ...layout,
        seats: layout.seats.map((s) => (s.id === action.seatId ? { ...s, teamId: action.teamId } : s)),
      }
    }
    case 'seat-swap': {
      const from = layout.seats.find((s) => s.id === action.fromSeatId)
      const to = layout.seats.find((s) => s.id === action.toSeatId)
      if (!from || !to) return layout
      return {
        ...layout,
        seats: layout.seats.map((s) => {
          if (s.id === from.id) return { ...s, employeeId: to.employeeId }
          if (s.id === to.id) return { ...s, employeeId: from.employeeId }
          return s
        }),
      }
    }
    case 'team-move': {
      const team = layout.teams.find((t) => t.id === action.teamId)
      if (!team) return layout
      const dx = action.x - team.area.x
      const dy = action.y - team.area.y
      return {
        ...layout,
        teams: layout.teams.map((t) =>
          t.id === action.teamId ? { ...t, area: { ...t.area, x: action.x, y: action.y } } : t
        ),
        seats: layout.seats.map((s) =>
          s.teamId === action.teamId ? { ...s, x: s.x + dx, y: s.y + dy } : s
        ),
      }
    }
    case 'team-relayout': {
      const team = layout.teams.find((t) => t.id === action.teamId)
      if (!team) return layout
      const teamSeats = layout.seats.filter((s) => s.teamId === action.teamId)
      if (teamSeats.length === 0) return layout
      const relaid = relayoutSeatsInGrid(teamSeats, team.area, action.rows, action.cols)
      const fitted = fitAreaToSeats(relaid, team.area)
      const relaidById = new Map(relaid.map((s) => [s.id, s]))
      return {
        ...layout,
        teams: layout.teams.map((t) => (t.id === action.teamId ? { ...t, area: fitted } : t)),
        seats: layout.seats.map((s) => relaidById.get(s.id) ?? s),
      }
    }
    default:
      return layout
  }
}
