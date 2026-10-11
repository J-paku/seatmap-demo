import { insetRect, pointInRect, rectOf, rectsIntersect } from './rect'
import type { Rect } from './rect'
import { rectsOfKinds } from './layout-objects'
import type { LayoutObjectRef, Seat, SeatLayout, Team } from '@/types'

// 07-admin-edit: アクション発行前の検証規則。違反はリデューサーに到達させない。
// 「どこに何があるか」は utils/layout/layout-objects が答える。ここが持つのは
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

// §04-4: チーム枠を障害物として当てるときの内側インセット。枠線に触れる程度の重なりは通す
const TEAM_COLLISION_INSET = 4

// §04-4 の障害物。①全チーム枠(4px内側インセット) ②会議室(設備)だけ。
// 壁・ソファなどの家具は重なり配置を許す。
//
// 吸着候補(sibling-rects)は全家具を含むのに障害物は設備だけ、という非対称は意図的。
// 家具は「揃えたいが避ける必要はない」もので、避けさせると壁沿いに何も置けなくなる
const obstacleRects = (layout: SeatLayout, self: LayoutObjectRef | null): Rect[] => [
  ...rectsOfKinds(layout, ['team'], self).map((r) => insetRect(r, TEAM_COLLISION_INSET)),
  ...rectsOfKinds(layout, ['facility'], self),
]

// 置けない理由。重なっている相手の矩形を返し、表示側が強調に使う。
// フロア(viewBox)外は制限しない — フロアはあくまで初期表示の範囲で、配置はどこでも可
export type PlacementBlockReason = { kind: 'overlap'; rects: Rect[] }

// 会議室・家具・チーム枠の新規配置と再配置の可否。
//
// ゴーストの表示判定と発行前の検証が同じ関数を通ることが要点。別々に書くと
// 「ゴーストは置けると言うのに確定すると何も起きない」という無言の失敗になる。
//
// 座席がチームエリアの内側に載るのは正常(所属を表す)なので、その判定はここではなく
// findTeamContaining が担う — 同じ「重なり」でも意味が違うので混ぜない
export const placementBlockReason = (
  layout: SeatLayout,
  self: LayoutObjectRef | null,
  candidate: Rect
): PlacementBlockReason | null => {
  const hits = obstacleRects(layout, self).filter((r) => rectsIntersect(r, candidate))
  return hits.length > 0 ? { kind: 'overlap', rects: hits } : null
}

// 真偽だけ欲しい発行前検証用。判定本体は placementBlockReason 1つに置く(判定基準は概念あたり1つ)
export const placementBlocked = (layout: SeatLayout, self: LayoutObjectRef | null, candidate: Rect): boolean =>
  placementBlockReason(layout, self, candidate) !== null

// §05-3: ロック・レイアウト固定で編集を拒む対象かどうか。拒む場合だけ理由文言を返す。
//
// 判定をここ1つに置くのは、同じ「ロック中か」を入口(ゴーストを開く側)と発行口(editor)の
// 両方が見るため。条件を各所で組み立て直すと、片方だけ locked を見て fixedLayout を見落とす、
// といったズレが静かに入る(03-pitfalls #4)。
// 文言の骨格は §07-2 のロック文と揃え、動詞だけを呼び出し側から受ける
export const lockedMessage = (layout: SeatLayout, ref: LayoutObjectRef, action: string): string | null => {
  const suffix = (label: string): string => `「${label}」はロックまたはレイアウト固定中のため${action}できません`
  if (ref.kind === 'team') {
    const team = layout.teams.find((t) => t.id === ref.id)
    if (!team) return null
    return team.locked || team.fixedLayout ? suffix(team.name) : null
  }
  if (ref.kind === 'facility') {
    const facility = layout.facilities.find((f) => f.id === ref.id)
    if (!facility) return null
    return facility.locked ? suffix(facility.name) : null
  }
  if (ref.kind === 'furniture') {
    const item = layout.furniture.find((f) => f.id === ref.id)
    if (!item) return null
    return item.locked ? suffix(item.name || '家具') : null
  }
  // 座席のロックは持たない(Seat に locked が無い)。ここで嘘の許可を返さないよう明示する
  return null
}

// §05-3 の移動専用ロック判定。チームだけ fixedLayout を見ない —
// レイアウト固定が縛るのは枠の内側の座席グリッドであって、島を床のどこへ置くかではない
// (team-move は枠と所属座席を同じ差分で平行移動するのでグリッドの形は保たれる)。
// 会議室・家具も条件は locked だけなので、文言の骨格をここで揃える
export const lockedForMoveMessage = (layout: SeatLayout, ref: LayoutObjectRef): string | null => {
  const suffix = (label: string): string => `「${label}」はロック中のため移動できません`
  if (ref.kind === 'team') {
    const team = layout.teams.find((t) => t.id === ref.id)
    if (!team) return null
    return team.locked ? suffix(team.name) : null
  }
  if (ref.kind === 'facility') {
    const facility = layout.facilities.find((f) => f.id === ref.id)
    if (!facility) return null
    return facility.locked ? suffix(facility.name) : null
  }
  if (ref.kind === 'furniture') {
    const item = layout.furniture.find((f) => f.id === ref.id)
    if (!item) return null
    return item.locked ? suffix(item.name || '家具') : null
  }
  return null
}
