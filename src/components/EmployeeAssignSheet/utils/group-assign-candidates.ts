// useEmployeeAssign(配属候補シート)が使う候補の絞り込み・並び替え・部門ツリー化
import { matchesEmployeeQuery } from '@/utils/employee-search'
import { normalizeDepartment } from '@/utils/unassigned-department'
import type { Employee, Seat } from '@/types'

export type AssignCandidate = {
  employee: Employee
  // 既に座っている席(あれば)。選ぶと移動/入れ替えになることの予告に使う
  seatedAt: string | null
  // §06-4/§07-4: 対象席が空席 かつ 本人が未配属の組み合わせだけ確認なしで即配属できる。
  // それ以外は呼び出し側で確認モーダルを挟む(モーダル自体の文言・実際の呼び出しは別ラウンド担当。
  // ここでは「確認が要るかどうか」の分岐だけを確定する)
  needsConfirm: boolean
}

export type AssignDepartmentGroup = {
  department: string
  candidates: AssignCandidate[]
}

// §06-4: 空クエリ=未配属者全員。非空クエリは名前・チーム・社員番号(カナ含む)の部分一致
export const filterCandidateEmployees = (
  employees: Employee[],
  query: string,
  seatByEmployee: Map<string, Seat>
): Employee[] => {
  const isSearching = query.trim().length > 0
  if (!isSearching) return employees.filter(employee => !seatByEmployee.has(employee.id))
  return employees.filter(employee => matchesEmployeeQuery(employee, query))
}

// §06-4: ソート 未配属→チーム→名前→ID
export const sortCandidates = (candidates: AssignCandidate[]): AssignCandidate[] =>
  [...candidates].sort((left, right) => {
    const seatedDiff = Number(left.seatedAt !== null) - Number(right.seatedAt !== null)
    if (seatedDiff !== 0) return seatedDiff
    const teamDiff = left.employee.team.localeCompare(right.employee.team, 'ja')
    if (teamDiff !== 0) return teamDiff
    const nameDiff = left.employee.name.localeCompare(right.employee.name, 'ja')
    if (nameDiff !== 0) return nameDiff
    return left.employee.id.localeCompare(right.employee.id, 'ja')
  })

// §06-4: 部門ツリー = 所属でグループ化 → 五十音順 → お気に入り繰り上げ → 現在チーム絶対先頭
export const buildDepartmentGroups = (
  candidates: AssignCandidate[],
  favoriteDepartments: Set<string>,
  currentDepartment: string | null
): AssignDepartmentGroup[] => {
  const grouped = new Map<string, AssignCandidate[]>()
  for (const candidate of candidates) {
    const department = normalizeDepartment(candidate.employee.team)
    const list = grouped.get(department)
    if (list) list.push(candidate)
    else grouped.set(department, [candidate])
  }

  // 部署名ではなく束ねた組そのものを並べる。名前から組を引き直さないので、見つからない時の代わりの値が要らない
  const groups = Array.from(grouped, ([department, list]) => ({
    department,
    candidates: list,
  })).sort((a, b) => a.department.localeCompare(b.department, 'ja'))
  const favorites = groups.filter(group => favoriteDepartments.has(group.department))
  const rest = groups.filter(group => !favoriteDepartments.has(group.department))
  const ordered = [...favorites, ...rest]
  // 現在チームは候補に組がある時だけ先頭へ出す(候補に無い部署を足すことはない)
  const current = ordered.find(group => group.department === currentDepartment)
  return current ? [current, ...ordered.filter(group => group !== current)] : ordered
}
