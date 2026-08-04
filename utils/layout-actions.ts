// 07-admin-edit: レイアウト編集のアクション定義と純粋リデューサー(副作用なし)
import { RELAYOUT_COL_GAP, RELAYOUT_PADDING, DEFAULT_SEAT_HEIGHT, DEFAULT_SEAT_WIDTH, fitAreaToSeats, relayoutSeatsInGrid, sortSeatsForRelayout } from './seat-relayout'
import type { Seat, SeatLayout } from '@/types'

export type LayoutAction =
  | { type: 'seat-move'; seatId: string; x: number; y: number }
  | { type: 'seat-add'; teamId: string; x?: number; y?: number }
  | { type: 'seat-delete'; seatId: string }
  | { type: 'seat-assign'; seatId: string; teamId: string }
  | { type: 'seat-swap'; fromSeatId: string; toSeatId: string }
  | { type: 'team-move'; teamId: string; x: number; y: number }
  | { type: 'team-relayout'; teamId: string; rows: number; cols: number }
  // facilityId はレイアウト上の Facility.id を指す。予定システム側の Facility.facilityId ではない
  | { type: 'facility-delete'; facilityId: string }

// 対象チームの idPrefix を正規表現用にエスケープ
const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// 次の座席id(11: id形式は '${idPrefix}-NNN'。対象チームの既存連番の最大値+1を3桁ゼロ埋めで採番)
const nextSeatId = (seats: Seat[], idPrefix: string): string => {
  const pattern = new RegExp(`^${escapeRegExp(idPrefix)}-(\\d+)$`)
  let max = 0
  for (const s of seats) {
    const m = pattern.exec(s.id)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `${idPrefix}-${String(max + 1).padStart(3, '0')}`
}

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
        id: nextSeatId(layout.seats, team.idPrefix),
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
    case 'facility-delete': {
      // 照合キーは Facility.id。facilityId フィールドと紛らわしいので取り違えない
      if (!layout.facilities.some((f) => f.id === action.facilityId)) return layout
      return { ...layout, facilities: layout.facilities.filter((f) => f.id !== action.facilityId) }
    }
    default:
      return layout
  }
}
