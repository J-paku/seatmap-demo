import { useCallback, useMemo, useState } from 'react'
import type { Employee } from '@/types'
import type { DeptGroup, DirectoryFavorites } from '../type'

// お気に入り(社員単位・部署単位)。部署をお気に入りにすると所属全員が一覧へ入る

const toggleIn = (set: Set<string>, key: string): Set<string> => {
  const next = new Set(set)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  return next
}

export const useDirectoryFavorites = (groups: DeptGroup[]): DirectoryFavorites => {
  const [employeeIds, setEmployeeIds] = useState<Set<string>>(new Set())
  const [deptNames, setDeptNames] = useState<Set<string>>(new Set())

  const members = useMemo(() => {
    const list: Employee[] = []
    const seen = new Set<string>()
    for (const group of groups) {
      const inFavDept = deptNames.has(group.teamName)
      for (const emp of group.members) {
        if ((inFavDept || employeeIds.has(emp.id)) && !seen.has(emp.id)) {
          seen.add(emp.id)
          list.push(emp)
        }
      }
    }
    return list
  }, [groups, employeeIds, deptNames])

  return {
    employeeIds,
    deptNames,
    members,
    toggleEmployee: useCallback((empId: string) => setEmployeeIds((prev) => toggleIn(prev, empId)), []),
    toggleDept: useCallback((teamName: string) => setDeptNames((prev) => toggleIn(prev, teamName)), []),
  }
}
