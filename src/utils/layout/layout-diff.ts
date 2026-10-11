// 07-admin-edit: 変更件数を「編集開始時点(baseline)と編集中レイアウトの差分」から数える純関数。
//
// 呼び出し側が触った id を申告する方式では、チームを1回動かしただけで
// 「チーム+所属座席」が全て計上され7〜10件になっていた。差分から数えれば実際に変わったものだけが残り、
// 元へ戻す操作で件数も戻る。
//
// 数え方(実物の編集セッション仕様):
//   件数 = 変更された家具・会議室の数 + 変更されたチームの数
//        + 変更された座席のうち「変更されたチームに属さない」ものの数
// チームが動けば所属座席も一緒に動くので、その分は二重計上しない
import type { SeatLayout } from '@/types'

// 差分の単位。レイアウト上のコレクションは全て id を持つ
type Identified = { id: string }

// SeatLayout の配列フィールド名だけを取り出す。フィールドが増えればこの union も増える
type LayoutCollectionKey = {
  [K in keyof SeatLayout]-?: SeatLayout[K] extends ReadonlyArray<infer Item> ? K : never
}[keyof SeatLayout]

// コレクションごとの数え方:
// - 'entity' 変更されたものをそのまま1件ずつ数える(会議室・家具)
// - 'team'   同じく1件ずつ数える。加えてその id 集合が座席側の除外条件になる
// - 'seat'   Seat.teamId を見て、変更されたチームに属する分を落としてから数える
type CountRole = 'entity' | 'team' | 'seat'

// SeatLayout に配列フィールドを足すとこの Record のキーが不足してコンパイルが落ちる。
// 「新しい編集対象だけが件数に乗らず、変更したのに変更0件で完了が押せない」という
// 無言の失敗を型で塞ぐ(注釈で「ここも直せ」と書くだけでは足りない)
const COUNT_ROLES: Record<LayoutCollectionKey, CountRole> = {
  seats: 'seat',
  teams: 'team',
  facilities: 'entity',
  furniture: 'entity',
}

// Object.entries はキーを string へ広げるので、宣言時の型へ戻す
const COUNT_ROLE_ENTRIES = Object.entries(COUNT_ROLES) as [LayoutCollectionKey, CountRole][]

// id → 1件分の文字列表現。両者は同じ深いコピーから派生し(enterEditMode のクローン →
// applyLayoutAction のスプレッド)キー順が保たれるので文字列比較で足りる。
// 万一キー順がずれても「変わった」側へ倒れるだけで、数え落とし(無言の失敗)にはならない
const serializedById = (entities: readonly Identified[]): Map<string, string> =>
  new Map(entities.map((entity): [string, string] => [entity.id, JSON.stringify(entity)]))

// 追加・削除・内容変更のいずれかに当たる id。片側にしか無い id は undefined との比較になり
// 必ず「変わった」側へ入る
const changedIdsOf = (before: readonly Identified[], after: readonly Identified[]): Set<string> => {
  const beforeById = serializedById(before)
  const afterById = serializedById(after)
  const allIds = new Set([...beforeById.keys(), ...afterById.keys()])
  return new Set([...allIds].filter(id => beforeById.get(id) !== afterById.get(id)))
}

// 変更された座席のうち、変更されたチームに属さないものだけを数える。
// 所属は baseline・現在のどちらで見ても判定する — チーム跨ぎの移動は
// 「移動元チーム」「移動先チーム」のどちらが変更されていても、そのチームの変更に含まれる
const seatsOutsideChangedTeams = (
  baseline: SeatLayout,
  current: SeatLayout,
  changedSeatIds: Set<string>,
  changedTeamIds: Set<string>
): number => {
  const seatIdsInChangedTeams = new Set(
    [...baseline.seats, ...current.seats]
      .filter(seat => changedTeamIds.has(seat.teamId))
      .map(seat => seat.id)
  )
  return [...changedSeatIds].filter(seatId => !seatIdsInChangedTeams.has(seatId)).length
}

type CountContext = {
  baseline: SeatLayout
  current: SeatLayout
  changedTeamIds: Set<string>
}

// 役割を足してここにキーを書き忘れると、Record の型がコンパイルエラーになる
const COUNTERS: Record<CountRole, (changedIds: Set<string>, context: CountContext) => number> = {
  entity: changedIds => changedIds.size,
  team: changedIds => changedIds.size,
  seat: (changedIds, { baseline, current, changedTeamIds }) =>
    seatsOutsideChangedTeams(baseline, current, changedIds, changedTeamIds),
}

export const countLayoutChanges = (baseline: SeatLayout, current: SeatLayout): number => {
  // 座席側の除外条件になるので先に確定させる
  const context: CountContext = {
    baseline,
    current,
    changedTeamIds: changedIdsOf(baseline.teams, current.teams),
  }
  return COUNT_ROLE_ENTRIES.reduce(
    (total, [key, role]) =>
      total + COUNTERS[role](changedIdsOf(baseline[key], current[key]), context),
    0
  )
}
