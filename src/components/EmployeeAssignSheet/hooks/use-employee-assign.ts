import { useEffect, useMemo, useState } from 'react'
import { readFavoriteDepartments } from '@/lib/seat/favorite-departments'
import type { Employee, Seat } from '@/types'
import { buildSeatByEmployee } from '@/utils/locate-employee-seat'
import { normalizeDepartment } from '@/utils/unassigned-department'
import {
  buildDepartmentGroups,
  filterCandidateEmployees,
  sortCandidates,
  type AssignCandidate,
  type AssignDepartmentGroup,
} from '../utils/group-assign-candidates'

// 配属候補の絞り込み・並び替え・部門ツリー化と、各社員が今どこに座っているかの解決。
// 並び替え・グルーピングの本体は React に依存しない純関数として分離し(utils/group-assign-candidates.ts)、node から直接
// 実行検証できるようにする(フック本体はローカル状態と useMemo で純関数をつなぐだけ)

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
      base.map(employee => {
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
    const member = employees.find(employee => employee.teamId === targetSeat.teamId)
    return member ? normalizeDepartment(member.team) : null
  }, [employees, targetSeat])

  const departmentGroups = useMemo<AssignDepartmentGroup[]>(
    () => buildDepartmentGroups(candidates, favoriteDepartments, currentDepartment),
    [candidates, favoriteDepartments, currentDepartment]
  )

  // 検索中は該当部門(=departmentGroupsに残っている部門)を強制展開する。解除で手動状態へ戻す
  const expandedDepartments = useMemo(() => {
    if (isSearching) return new Set(departmentGroups.map(group => group.department))
    return manualExpanded
  }, [isSearching, departmentGroups, manualExpanded])

  const toggleDepartment = (department: string) => {
    setManualExpanded(prev => {
      const next = new Set(prev)
      if (next.has(department)) next.delete(department)
      else next.add(department)
      return next
    })
  }

  // STEP C3: 部署一括配置ボタンの押下可否。対象席のチームに社員が1人もいなければボタンを
  // 出しても何も起きないため、ここで判定しておく(実際の一括配置処理はuse-bulk-assignへ寄せる)
  const canBulkAssign = useMemo(
    () => targetSeat !== null && employees.some(employee => employee.teamId === targetSeat.teamId),
    [employees, targetSeat]
  )

  // §06-4 E: 一括取込の対象は「対象席のチームに属する社員全員」(検索クエリとは独立)。
  // needsConfirmはbulk側では使わない(§07-5の一括移動確認はuse-bulk-assign側の管轄)ため常にfalse
  const bulkMembers = useMemo<AssignCandidate[]>(() => {
    if (!targetSeat) return []
    const members = employees.filter(employee => employee.teamId === targetSeat.teamId)
    return sortCandidates(
      members.map(employee => ({
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
