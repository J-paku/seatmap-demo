import { pointInRect, rectOf, rectsIntersect } from './rect'
import type { Rect } from './rect'
import { rectsOfKinds } from './layout-objects'
import type { LayoutObjectRef, Seat, SeatLayout, Team } from '@/types'

// 07-admin-edit: アクション発行前の検証規則。違反はリデューサーに到達させない。
// 「どこに何があるか」は utils/layout-objects が答える。ここが持つのは
// 「ぶつかったら何が起きるか」というポリシーだけ(座席同士は入れ替え・会議室とは拒否など)

const areaRect = (area: Team['area']): Rect => ({ x: area.x, y: area.y, w: area.w, h: area.h })

// Team area 同士の重なり判定(対象チーム自身は除外)
export const teamAreaOverlaps = (teams: Team[], targetTeamId: string, candidate: Rect): boolean =>
  teams.some((t) => t.id !== targetTeamId && rectsIntersect(areaRect(t.area), candidate))

// 座席と固定物(会議室・家具)の重なり判定。家具も物理的な障害物なので同じ扱いにする
export const seatOverlapsFixture = (layout: SeatLayout, candidate: Rect): boolean =>
  rectsOfKinds(layout, ['facility', 'furniture']).some((r) => rectsIntersect(r, candidate))

// ドロップ先で重なる他座席(あればスワップとして解釈する)
export const findOverlappingSeat = (seats: Seat[], excludeSeatId: string, candidate: Rect): Seat | null =>
  seats.find((s) => s.id !== excludeSeatId && rectsIntersect(rectOf(s), candidate)) ?? null

// 候補矩形の中心を含む他チーム(あれば teamId を連鎖更新する)
export const findTeamContaining = (teams: Team[], excludeTeamId: string, candidate: Rect): Team | null =>
  teams.find(
    (t) => t.id !== excludeTeamId && pointInRect(candidate.x + candidate.w / 2, candidate.y + candidate.h / 2, areaRect(t.area))
  ) ?? null

// 会議室・家具の新規配置と再配置の可否。座席・チームエリア・会議室・家具の全てが障害物になる。
// 座席がチームエリアの内側に載るのは正常(所属を表す)なので、その判定はここではなく
// findTeamContaining が担う — 同じ「重なり」でも意味が違うので混ぜない
export const placementBlocked = (layout: SeatLayout, self: LayoutObjectRef | null, candidate: Rect): boolean =>
  rectsOfKinds(layout, ['seat', 'team', 'facility', 'furniture'], self).some((r) => rectsIntersect(r, candidate))
