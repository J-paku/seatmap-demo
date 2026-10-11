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
import type { Seat, SeatLayout } from '@/types'

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

// 1件分が変わったか。両者は同じ深いコピーから派生し(enterEditMode のクローン →
// applyLayoutAction のスプレッド)キー順が保たれるので文字列比較で足りる。
// 万一キー順がずれても「変わった」側へ倒れるだけで、数え落とし(無言の失敗)にはならない
const isSameEntity = (before: Identified, after: Identified): boolean =>
  JSON.stringify(before) === JSON.stringify(after)

// 追加・削除・内容変更のいずれかに当たる id
const changedIdsOf = (before: readonly Identified[], after: readonly Identified[]): Set<string> => {
  const afterById = new Map(after.map((entity): [string, Identified] => [entity.id, entity]))
  const beforeIds = new Set(before.map((entity) => entity.id))
  const changed = new Set<string>()
  for (const entity of before) {
    const next = afterById.get(entity.id)
    if (!next || !isSameEntity(entity, next)) changed.add(entity.id)
  }
  for (const entity of after) {
    if (!beforeIds.has(entity.id)) changed.add(entity.id)
  }
  return changed
}

const teamIdBySeatId = (seats: readonly Seat[]): Map<string, string> =>
  new Map(seats.map((seat): [string, string] => [seat.id, seat.teamId]))

// 変更された座席のうち、変更されたチームに属さないものだけを数える。
// 所属は baseline・現在のどちらで見ても判定する — チーム跨ぎの移動は
// 「移動元チーム」「移動先チーム」のどちらが変更されていても、そのチームの変更に含まれる
const seatsOutsideChangedTeams = (
  baseline: SeatLayout,
  current: SeatLayout,
  changedSeatIds: Set<string>,
  changedTeamIds: Set<string>
): number => {
  if (changedTeamIds.size === 0) return changedSeatIds.size
  const before = teamIdBySeatId(baseline.seats)
  const after = teamIdBySeatId(current.seats)
  let count = 0
  for (const seatId of changedSeatIds) {
    const beforeTeamId = before.get(seatId)
    const afterTeamId = after.get(seatId)
    const belongsToChangedTeam =
      (beforeTeamId !== undefined && changedTeamIds.has(beforeTeamId)) ||
      (afterTeamId !== undefined && changedTeamIds.has(afterTeamId))
    if (!belongsToChangedTeam) count += 1
  }
  return count
}

export const countLayoutChanges = (baseline: SeatLayout, current: SeatLayout): number => {
  const changedIdsByCollection = new Map<LayoutCollectionKey, Set<string>>()
  for (const [key] of COUNT_ROLE_ENTRIES) {
    changedIdsByCollection.set(key, changedIdsOf(baseline[key], current[key]))
  }
  // 座席側の除外条件になるので先に確定させる
  const changedTeamIds = changedIdsByCollection.get('teams') ?? new Set<string>()

  let total = 0
  for (const [key, role] of COUNT_ROLE_ENTRIES) {
    const changedIds = changedIdsByCollection.get(key) ?? new Set<string>()
    switch (role) {
      case 'entity':
      case 'team':
        total += changedIds.size
        break
      case 'seat':
        total += seatsOutsideChangedTeams(baseline, current, changedIds, changedTeamIds)
        break
      default: {
        // 役割を足してここに case を書き忘れると、この代入がコンパイルエラーになる
        const exhaustive: never = role
        return exhaustive
      }
    }
  }
  return total
}
