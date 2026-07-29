import { pointInRect, rectOf, rectsIntersect } from './rect'
import type { Rect } from './rect'
import type { Facility, Seat, Team } from '@/types'

// 07-admin-edit: アクション発行前の検証規則。違反はリデューサーに到達させない

const areaRect = (area: Team['area']): Rect => ({ x: area.x, y: area.y, w: area.w, h: area.h })

// Team area 同士の重なり判定(対象チーム自身は除外)
export const teamAreaOverlaps = (teams: Team[], targetTeamId: string, candidate: Rect): boolean =>
  teams.some((t) => t.id !== targetTeamId && rectsIntersect(areaRect(t.area), candidate))

// 座席と Facility の重なり判定
export const seatOverlapsFacility = (facilities: Facility[], candidate: Rect): boolean =>
  facilities.some((f) => rectsIntersect(rectOf(f), candidate))

// ドロップ先で重なる他座席(あればスワップとして解釈する)
export const findOverlappingSeat = (seats: Seat[], excludeSeatId: string, candidate: Rect): Seat | null =>
  seats.find((s) => s.id !== excludeSeatId && rectsIntersect(rectOf(s), candidate)) ?? null

// 候補矩形の中心を含む他チーム(あれば teamId を連鎖更新する)
export const findTeamContaining = (teams: Team[], excludeTeamId: string, candidate: Rect): Team | null =>
  teams.find(
    (t) => t.id !== excludeTeamId && pointInRect(candidate.x + candidate.w / 2, candidate.y + candidate.h / 2, areaRect(t.area))
  ) ?? null
