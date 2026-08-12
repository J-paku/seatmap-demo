// §02-3 既存チーム取り込みの組み立て。採番(idPrefix・チームid)・ラベル重複回避・
// 座席の再接頭辞複製・自動配置の呼び出しをこの1ファイルに閉じる。
//
// 格子探索そのものは spiral-placement、レイアウトへの反映は layout-actions の 'team-import' が持つ。
// 当たり判定は layout-rules の既存関数をそのまま呼ぶ — 取り込みだけ別の当たり判定を作ると
// 「ゴーストでは置けない場所へ取り込みだけ置ける」というずれが生まれる
import { nextSequentialId } from './layout-actions'
import { rectsOfKinds } from './layout-objects'
import { placementBlocked, teamAreaOverlaps } from './layout-rules'
import { rectsIntersect } from './rect'
import type { Rect } from './rect'
import { findSpiralSpot } from './spiral-placement'
import type { PlacementStage } from './spiral-placement'
import type { Seat, SeatLayout, Team } from '@/types'

// 取り込み元の1件。公式マスタのチーム枠と、そのチームに属する公式マスタの座席
export type TeamImportSource = { team: Team; seats: Seat[] }

export type TeamImportPlan = {
  // 追加されるチーム(既存分は含まない)
  teams: Team[]
  // 追加される座席。teamId は上の teams の id を指す
  seats: Seat[]
  // 1件ごとにどの段で置けたか。①で置けたのか③の強制だったのかを検証と報告が見る
  stages: PlacementStage[]
  // 3段とも尽きて置けなかった件数(警告文言の {n})
  unplacedCount: number
}

// §02-3 の新しい idPrefix はアルファベット順。0='A' … 25='Z' … 26='AA'(26進の桁上がり)
const alphabetPrefix = (index: number): string => {
  let rest = index
  let label = ''
  while (rest >= 0) {
    label = String.fromCharCode(65 + (rest % 26)) + label
    rest = Math.floor(rest / 26) - 1
  }
  return label
}

// 未使用のアルファベット接頭辞。既存チームが 'A' を持っていれば 'B' へ送る
const nextAlphabetPrefix = (taken: ReadonlySet<string>): string => {
  let index = 0
  while (taken.has(alphabetPrefix(index))) index += 1
  return alphabetPrefix(index)
}

// §02-3 のラベル重複回避。先頭の半角スペースを含めて「 (2)」「 (3)」を付け足す
const uniqueTeamName = (base: string, taken: ReadonlySet<string>): string => {
  if (!taken.has(base)) return base
  let serial = 2
  while (taken.has(`${base} (${serial})`)) serial += 1
  return `${base} (${serial})`
}

// §02-3 の座席ID再接頭辞化。最後の「-」より後ろだけを残す
// ('3328237-100-001' + 'A' → 'A-001')。「-」を含まないidは連番部とみなして丸ごと残す
const reprefixSeatId = (sourceSeatId: string, idPrefix: string): string =>
  `${idPrefix}-${sourceSeatId.slice(sourceSeatId.lastIndexOf('-') + 1)}`

// 取り込み1件ぶんの座席複製。枠の移動量だけ平行移動し、所属は新しいチームidへ差し替える
const cloneSeats = (source: TeamImportSource, team: Team, delta: { x: number; y: number }): Seat[] => {
  const usedIds = new Set<string>()
  return source.seats.map((seat) => {
    let id = reprefixSeatId(seat.id, team.idPrefix)
    // 元の座席IDの連番部が重複していた場合の逃げ道。接頭辞は未使用の値なので
    // 既存レイアウトとは衝突しないが、複製元の中で衝突すると席が1つ消える
    while (usedIds.has(id)) id = `${id}-2`
    usedIds.add(id)
    return {
      id,
      // 所属判定の正本は teamId(DECISION D1)。idPrefix は上の採番にしか使わない
      teamId: team.id,
      x: seat.x + delta.x,
      y: seat.y + delta.y,
      width: seat.width,
      height: seat.height,
      rotation: seat.rotation,
      // 社員は連れてこない。同じ社員が2席に座ると着席判定(employeeId 基準)が壊れる
      employeeId: null,
      shape: seat.shape,
      isSizeOverridden: seat.isSizeOverridden,
    }
  })
}

export const buildTeamImportPlan = (
  layout: SeatLayout,
  sources: TeamImportSource[],
  anchor: { x: number; y: number }
): TeamImportPlan => {
  const takenPrefixes = new Set(layout.teams.map((t) => t.idPrefix))
  const takenNames = new Set(layout.teams.map((t) => t.name))
  const takenTeamIds = layout.teams.map((t) => t.id)
  // 家具は placementBlocked の障害物ではない(§04-4 の非対称は意図的)。
  // §02-3 の①は家具も避けるので、この段でだけ足す
  const furnitureRects = rectsOfKinds(layout, ['furniture'])
  // 同じ取り込みで先に置いた枠。レイアウトにはまだ載っていないので自前で持つ
  const placedRects: Rect[] = []

  const teams: Team[] = []
  const seats: Seat[] = []
  const stages: PlacementStage[] = []
  let unplacedCount = 0

  for (const source of sources) {
    const size = { width: source.team.area.w, height: source.team.area.h }
    const spot = findSpiralSpot(anchor, size, layout.viewBox, (rect, stage) => {
      // 段に関わらず、同じ取り込みで置いた枠には重ねない。③でもここだけは効かせる
      // (効かせないと強制配置が全件アンカーの同一点へ重なる)
      if (placedRects.some((placed) => rectsIntersect(placed, rect))) return true
      // ③強制オフセット配置: 既存物を避けない
      if (stage === 'forced') return false
      // ②チームのみ回避。teamAreaOverlaps はチーム枠を内側インセットせずに見るので
      // ①よりチーム枠の 4px ぶんだけ厳しいが、設備・家具を落とすぶん全体では緩い
      if (stage === 'avoid-teams') return teamAreaOverlaps(layout.teams, '', rect)
      // ①チーム枠(4px内側インセット)+設備+フロア外 = ゴースト配置と同じ判定 + 家具
      return placementBlocked(layout, null, rect) || furnitureRects.some((r) => rectsIntersect(r, rect))
    })

    if (!spot) {
      unplacedCount += 1
      continue
    }

    const idPrefix = nextAlphabetPrefix(takenPrefixes)
    takenPrefixes.add(idPrefix)
    const name = uniqueTeamName(source.team.name, takenNames)
    takenNames.add(name)
    const id = nextSequentialId(takenTeamIds, 'team-', 2)
    takenTeamIds.push(id)

    // labelX / labelY は引き継がない。取り込み元の絶対座標なので、移した先では
    // ラベルだけが元の位置に取り残される(未指定なら area 追従になる)
    const team: Team = {
      id,
      idPrefix,
      name,
      color: source.team.color,
      area: { x: spot.rect.x, y: spot.rect.y, w: spot.rect.w, h: spot.rect.h },
    }
    teams.push(team)
    seats.push(
      ...cloneSeats(source, team, { x: spot.rect.x - source.team.area.x, y: spot.rect.y - source.team.area.y })
    )
    stages.push(spot.stage)
    placedRects.push(spot.rect)
  }

  return { teams, seats, stages, unplacedCount }
}
