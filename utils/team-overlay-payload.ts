// チームIDと画面上の矩形から TeamOverlay のペイロードを組み立てる純関数。
// バウンダリのタップ経路と検索ジャンプ経路の両方がここを通す。
// 組み立てを2箇所に散らすと「チーム色をどう解決するか」の判定基準が二重化するため共通化する
import type { Team, TeamOverlayPayload } from '@/types'
import { resolveTeamColor } from '@/utils/team-colors'
import type { TeamColorEntry } from '@/utils/team-colors'

export const buildTeamOverlayPayload = (
  teams: Team[],
  colorMap: Map<string, TeamColorEntry>,
  teamId: string,
  rect: DOMRect
): TeamOverlayPayload | null => {
  const team = teams.find((candidate) => candidate.id === teamId)
  if (!team) return null
  return { teamId, teamName: team.name, teamColor: resolveTeamColor(colorMap, team.id, team.name).background, rect }
}
