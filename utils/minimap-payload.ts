// チームオーバーレイのミニマップへ渡すデータを SeatLayout から組み立てる純関数。
// チーム色の解決と「ミニマップ上でどう描き分けるか」の区分をここだけで決める。
// 組み立てを呼び出し側に散らすと同じ判定が二重化するため、team-overlay-payload.ts と同じ方針で共通化する
import { resolveTeamColor } from './team-colors'
import type { TeamColorEntry } from './team-colors'
import type { MinimapArea, MinimapFurniture, MinimapKind } from '@/components/TeamOverlay'
import type { Facility, SeatLayout, Team } from '@/types'

export type MinimapPayload = {
  areas: MinimapArea[]
  furniture: MinimapFurniture[]
  currentArea: MinimapArea | null
  viewBox: { width: number; height: number }
}

// 通路は名前を持たない薄い構造物。それ以外(meeting/booth/common)は名前つきの箱として描く
const kindOfFacility = (facility: Facility): MinimapKind => (facility.kind === 'aisle' ? 'aisle' : 'facility')

const toArea = (team: Team, colorMap: Map<string, TeamColorEntry>): MinimapArea => ({
  idPrefix: team.idPrefix,
  x: team.area.x,
  y: team.area.y,
  w: team.area.w,
  h: team.area.h,
  label: team.name,
  dotColor: resolveTeamColor(colorMap, team.id, team.name).background,
})

const toFurniture = (facility: Facility): MinimapFurniture => ({
  id: facility.id,
  kind: kindOfFacility(facility),
  name: facility.name,
  x: facility.x,
  y: facility.y,
  width: facility.width,
  height: facility.height,
})

export const buildMinimapPayload = (
  layout: SeatLayout,
  colorMap: Map<string, TeamColorEntry>,
  currentTeamId: string | null
): MinimapPayload => {
  const areas = layout.teams.map((team) => toArea(team, colorMap))
  const current = layout.teams.find((team) => team.id === currentTeamId)
  return {
    areas,
    // 家具(Furniture)が入ったらこの配列へ連結するだけでミニマップ側は無改修で載る
    furniture: layout.facilities.map(toFurniture),
    currentArea: current ? toArea(current, colorMap) : null,
    viewBox: layout.viewBox,
  }
}
