// 一括選択でチェックした社員IDの集合を切り替える。どちらも前の集合を変えず、新しい集合を返す
import type { AssignCandidate } from './group-assign-candidates'

// 1人分のチェックを反転する
export const toggleSelectedId = (prev: Set<string>, employeeId: string): Set<string> => {
  const next = new Set(prev)
  if (next.has(employeeId)) next.delete(employeeId)
  else next.add(employeeId)
  return next
}

// 全員が選ばれていれば全部外し、そうでなければ全員を選ぶ。
// 対象が0人の時はどちらへ分かれても空の集合になるので、0人かどうかは見ない
export const toggleAllSelected = (prev: Set<string>, members: AssignCandidate[]): Set<string> => {
  const allIds = members.map(candidate => candidate.employee.id)
  const allSelected = allIds.every(id => prev.has(id))
  return allSelected ? new Set() : new Set(allIds)
}
