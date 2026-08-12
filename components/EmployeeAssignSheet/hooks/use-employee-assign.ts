import { useEffect, useMemo, useState } from 'react'
import { matchesEmployeeQuery } from '@/utils/employee-search'
import { readFavoriteDepartments } from '@/lib/seat/favorite-departments'
import type { Employee, Seat } from '@/types'

// 配属候補の絞り込み・並び替え・部門ツリー化と、各社員が今どこに座っているかの解決。
// 並び替え・グルーピングの本体は React に依存しない純関数として分離し(下記)、node から直接
// 実行検証できるようにする(フック本体はローカル状態と useMemo で純関数をつなぐだけ)

// 「今どこに座っているか」の唯一の判定口。座席配列を先頭から走査し、最初に見つかった席を
// その社員の現在席とする(utils/layout/layout-actions.ts の seat-assign-employee が使う find と同じ先勝ち)。
// 検索シートだけでなく、部署一括配置(use-bulk-assign)と下書きの配属(use-seat-draft-state)も
// この1本を通す — 走査を各所で書くと先勝ち/後勝ちが食い違い、同じ人が2席に見える原因になる
export const buildSeatByEmployee = (seats: Seat[]): Map<string, Seat> => {
  const map = new Map<string, Seat>()
  for (const seat of seats) {
    if (seat.employeeId && !map.has(seat.employeeId)) map.set(seat.employeeId, seat)
  }
  return map
}

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

const UNASSIGNED_DEPARTMENT = '未所属'

// 所属部署名の正規化。空文字・空白のみは「未所属」に丸める
const departmentOf = (employee: Employee): string => {
  const trimmed = employee.team.trim()
  return trimmed.length > 0 ? trimmed : UNASSIGNED_DEPARTMENT
}

// §06-4: 空クエリ=未配属者全員。非空クエリは名前・チーム・社員番号(カナ含む)の部分一致
const filterCandidateEmployees = (
  employees: Employee[],
  query: string,
  seatByEmployee: Map<string, Seat>
): Employee[] => {
  const isSearching = query.trim().length > 0
  if (!isSearching) return employees.filter((employee) => !seatByEmployee.has(employee.id))
  return employees.filter((employee) => matchesEmployeeQuery(employee, query))
}

// §06-4: ソート 未配属→チーム→名前→ID
const sortCandidates = (candidates: AssignCandidate[]): AssignCandidate[] =>
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
const buildDepartmentGroups = (
  candidates: AssignCandidate[],
  favoriteDepartments: Set<string>,
  currentDepartment: string | null
): AssignDepartmentGroup[] => {
  const grouped = new Map<string, AssignCandidate[]>()
  for (const candidate of candidates) {
    const department = departmentOf(candidate.employee)
    const list = grouped.get(department)
    if (list) list.push(candidate)
    else grouped.set(department, [candidate])
  }

  const names = Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b, 'ja'))
  const favorites = names.filter((name) => favoriteDepartments.has(name))
  const rest = names.filter((name) => !favoriteDepartments.has(name))
  const ordered = [...favorites, ...rest]
  const pinned =
    currentDepartment && ordered.includes(currentDepartment)
      ? [currentDepartment, ...ordered.filter((name) => name !== currentDepartment)]
      : ordered

  return pinned.map((department) => ({
    department,
    candidates: grouped.get(department) ?? [],
  }))
}

export const useEmployeeAssign = (
  employees: Employee[],
  seats: Seat[],
  targetSeat: Seat | null,
  // 対象席が空席かどうか。判定は呼び出し側(EmployeeAssignSheet)が utils/seat-occupancy の
  // isOccupiedSeat 1本で行い、ここでは受け取るだけにする(着席判定基準を二重に持たない)
  isTargetSeatEmpty: boolean
) => {
  const [query, setQuery] = useState('')
  // 検索中に強制展開する前の、利用者が手で開閉した状態。検索解除時にこれへ復元する
  const [manualExpanded, setManualExpanded] = useState<Set<string>>(new Set())
  const [favoriteDepartments, setFavoriteDepartments] = useState<Set<string>>(new Set())

  // localStorage読み出しはクライアント専用。hydration一致のためマウント後に読む
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFavoriteDepartments(readFavoriteDepartments())
  }, [])

  const seatByEmployee = useMemo(() => buildSeatByEmployee(seats), [seats])
  const isSearching = query.trim().length > 0

  const candidates = useMemo<AssignCandidate[]>(() => {
    const base = filterCandidateEmployees(employees, query, seatByEmployee)
    return sortCandidates(
      base.map((employee) => {
        const seatedAt = seatByEmployee.get(employee.id)?.id ?? null
        return {
          employee,
          seatedAt,
          needsConfirm: !(isTargetSeatEmpty && seatedAt === null),
        }
      })
    )
  }, [employees, query, seatByEmployee, isTargetSeatEmpty])

  // 現在チーム名(対象席が属するチーム)。部門ツリーの絶対先頭・一括取込の対象部署ラベルに使う
  const currentDepartment = useMemo(() => {
    if (!targetSeat) return null
    const member = employees.find((employee) => employee.teamId === targetSeat.teamId)
    return member ? departmentOf(member) : null
  }, [employees, targetSeat])

  const departmentGroups = useMemo<AssignDepartmentGroup[]>(
    () => buildDepartmentGroups(candidates, favoriteDepartments, currentDepartment),
    [candidates, favoriteDepartments, currentDepartment]
  )

  // 検索中は該当部門(=departmentGroupsに残っている部門)を強制展開する。解除で手動状態へ戻す
  const expandedDepartments = useMemo(() => {
    if (isSearching) return new Set(departmentGroups.map((group) => group.department))
    return manualExpanded
  }, [isSearching, departmentGroups, manualExpanded])

  const toggleDepartment = (department: string) => {
    setManualExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(department)) next.delete(department)
      else next.add(department)
      return next
    })
  }

  // STEP C3: 部署一括配置ボタンの押下可否。対象席のチームに社員が1人もいなければボタンを
  // 出しても何も起きないため、ここで判定しておく(実際の一括配置処理はuse-bulk-assignへ寄せる)
  const canBulkAssign = useMemo(
    () => targetSeat !== null && employees.some((employee) => employee.teamId === targetSeat.teamId),
    [employees, targetSeat]
  )

  // §06-4 E: 一括取込の対象は「対象席のチームに属する社員全員」(検索クエリとは独立)。
  // needsConfirmはbulk側では使わない(§07-5の一括移動確認はuse-bulk-assign側の管轄)ため常にfalse
  const bulkMembers = useMemo<AssignCandidate[]>(() => {
    if (!targetSeat) return []
    const members = employees.filter((employee) => employee.teamId === targetSeat.teamId)
    return sortCandidates(
      members.map((employee) => ({
        employee,
        seatedAt: seatByEmployee.get(employee.id)?.id ?? null,
        needsConfirm: false,
      }))
    )
  }, [employees, targetSeat, seatByEmployee])

  return {
    query,
    setQuery,
    departmentGroups,
    isSearching,
    expandedDepartments,
    toggleDepartment,
    canBulkAssign,
    bulkMembers,
    currentDepartment,
  }
}
