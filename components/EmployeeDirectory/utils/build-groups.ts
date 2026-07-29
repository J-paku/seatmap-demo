import { UNASSIGNED_GROUP } from './directory-constants'
import type { Employee, Team } from '@/lib/types'
import type { DeptGroup } from '../type'

// 職位ランク(部長→課長→職位なし)。第2キーは id 昇順で安定ソート
const roleRank = (position?: string): number => {
  if (position === '部長') return 0
  if (position === '課長') return 1
  return 2
}

// teamId→Team を解決し、teams.json 定義順+末尾「未所属」でグループ化
export const buildGroups = (employees: Employee[], teams: Team[]): DeptGroup[] => {
  const teamNameById = new Map(teams.map((t) => [t.id, t.name]))
  const teamKanaByName = new Map(teams.map((t) => [t.name, t.kana]))
  const order = teams.map((t) => t.name)
  const buckets = new Map<string, Employee[]>()
  for (const emp of employees) {
    const name = teamNameById.get(emp.teamId) ?? UNASSIGNED_GROUP
    if (!buckets.has(name)) buckets.set(name, [])
    buckets.get(name)?.push(emp)
  }
  const orderedNames = [...order, UNASSIGNED_GROUP].filter((name) => buckets.has(name))
  return orderedNames.map((teamName) => {
    const members = [...(buckets.get(teamName) ?? [])].sort((a, b) => {
      const r = roleRank(a.position) - roleRank(b.position)
      if (r !== 0) return r
      return a.id.localeCompare(b.id)
    })
    return { teamName, teamKana: teamKanaByName.get(teamName) ?? '', members }
  })
}
