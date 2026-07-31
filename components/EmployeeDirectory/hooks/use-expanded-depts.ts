import { useCallback, useState } from 'react'
import type { DeptGroup } from '../type'

// 検索確定時にヒットした部署グループを自動展開し、クリア時は全接続を復帰する

type ExpandedDepts = {
  expandedDepts: Set<string>
  toggleDept: (teamName: string) => void
  resetExpandedDepts: () => void
}

export const useExpandedDepts = (
  debouncedQuery: string,
  isSearching: boolean,
  filteredGroups: DeptGroup[]
): ExpandedDepts => {
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set())

  // debouncedQuery の変化を state で追跡し、レンダー中に調整(ref を使わない React 公式パターン)
  const [prevDebouncedQuery, setPrevDebouncedQuery] = useState(debouncedQuery)
  if (prevDebouncedQuery !== debouncedQuery) {
    setPrevDebouncedQuery(debouncedQuery)
    setExpandedDepts(isSearching ? new Set(filteredGroups.map((g) => g.teamName)) : new Set())
  }

  const toggleDept = useCallback((teamName: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev)
      if (next.has(teamName)) next.delete(teamName)
      else next.add(teamName)
      return next
    })
  }, [])

  const resetExpandedDepts = useCallback(() => setExpandedDepts(new Set()), [])

  return { expandedDepts, toggleDept, resetExpandedDepts }
}
