// §02-3「デフォルトレイアウトのチームを配置」の取り込み元一覧。
//
// 原本は編集中レイアウトではなく公式マスタ(mocks の種データ)にする — 編集中の枠を複製すると
// 「さっき動かした位置」「さっき消した席」まで一緒に付いてきて、取り込むたびに形が変わる。
// 表示順は種データの並び(フロア順)をそのまま使う
import { FLOOR_SEEDS } from '@/lib/mock-loader'
import { FLOORS } from '@/utils/floors'
import type { TeamImportSource } from '@/utils/layout/team-import'

export const OFFICIAL_TEAM_IMPORT_SOURCES: TeamImportSource[] = FLOORS.flatMap((floor) => {
  const seed = FLOOR_SEEDS[floor.floorId]
  // 所属判定の正本は seat.teamId(DECISION D1)。idPrefix では引かない
  return seed.teams.map((team) => ({
    team,
    seats: seed.seats.filter((seat) => seat.teamId === team.id),
  }))
})
