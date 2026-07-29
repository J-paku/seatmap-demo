import { normalizeForSearch } from '@/utils/kana'
import type { DeptGroup } from '../type'

// 部署名ヒットは全員維持・非ヒットは社員単位でフィルタ
export const filterGroups = (groups: DeptGroup[], normalizedQuery: string): DeptGroup[] => {
  if (normalizedQuery.length === 0) return groups
  const result: DeptGroup[] = []
  for (const group of groups) {
    const deptHit =
      normalizeForSearch(group.teamName).includes(normalizedQuery) ||
      normalizeForSearch(group.teamKana).includes(normalizedQuery)
    if (deptHit) {
      result.push(group)
      continue
    }
    const members = group.members.filter(
      (emp) =>
        normalizeForSearch(emp.name).includes(normalizedQuery) ||
        normalizeForSearch(emp.nameKana).includes(normalizedQuery)
    )
    if (members.length > 0) result.push({ teamName: group.teamName, teamKana: group.teamKana, members })
  }
  return result
}
