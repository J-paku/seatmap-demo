import { rectOf } from '@/utils/rect'
import type { SeatLayout } from '@/types'
import type { Rect } from '../type'

// スナップ吸着候補になる兄弟オブジェクトの矩形群

export const siblingRectsForSeat = (layout: SeatLayout, excludeSeatId: string): Rect[] => [
  ...layout.seats.filter((s) => s.id !== excludeSeatId).map((s) => rectOf(s)),
  ...layout.facilities.map((f) => rectOf(f)),
  ...layout.teams.map((t) => ({ x: t.area.x, y: t.area.y, w: t.area.w, h: t.area.h })),
]

export const siblingRectsForTeam = (layout: SeatLayout, excludeTeamId: string): Rect[] => [
  ...layout.teams
    .filter((t) => t.id !== excludeTeamId)
    .map((t) => ({ x: t.area.x, y: t.area.y, w: t.area.w, h: t.area.h })),
  ...layout.facilities.map((f) => rectOf(f)),
]
