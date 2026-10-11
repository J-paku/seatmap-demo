// 座席編集の下書き(use-seat-draft-state)が使う、仮 id の接頭辞と id 集合の比較

// 下書きで追加した座席の仮 id。確定 id はレイアウト側の採番口が振るため、
// ここでは「まだ確定していない」と分かる接頭辞だけを持つ
export const DRAFT_SEAT_ID_PREFIX = 'seat-draft-'

// 2つのid集合が同じ内容か(順序は問わない)。§06-3のgrid移動席数の差し引きゼロ判定
// (use-seat-draft-state の syncMovedSeatIds)にしか使わない
export const isSameIdSet = (a: Set<string>, b: Set<string>): boolean => {
  if (a.size !== b.size) return false
  for (const id of a) {
    if (!b.has(id)) return false
  }
  return true
}
