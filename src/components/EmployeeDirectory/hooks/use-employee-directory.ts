// 社員ディレクトリの検索・展開状態を管理するフック
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Employee } from '@/types'
import { matchesEmployeeQuery, normalizeSearchText } from '@/utils/employee-search'
import { useFavorites } from './use-favorites'
import type { FavoritesContent } from '../components/DepartmentTree/types'
import { UNASSIGNED_DEPARTMENT } from '@/utils/unassigned-department'
import {
  normalizeDepartment,
  resolvePositionRank,
  resolveSortCode,
} from '../utils/sort-directory-employees'

interface DepartmentGroup {
  dept: string
  employees: Employee[]
}

interface UseEmployeeDirectoryResult {
  searchQuery: string
  setSearchQuery: (query: string) => void
  filteredTree: DepartmentGroup[]
  pinnedGroup: DepartmentGroup | null
  isPinnedExpanded: boolean
  togglePinned: () => void
  expandedDepts: Set<string>
  toggleDept: (dept: string) => void
  favoriteIds: Set<string>
  favoriteDeptNames: Set<string>
  isFavoritesExpanded: boolean
  favoritesContent: FavoritesContent | null
  toggleFavorite: (empId: string) => void
  toggleFavoriteDept: (dept: string) => void
  toggleFavoritesExpanded: () => void
}

export function useEmployeeDirectory(
  employees: Employee[],
  currentUserId?: string
): UseEmployeeDirectoryResult {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set())
  // マイ部署ピンの開閉状態（既定で展開）
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(true)
  const [isFavoritesExpanded, setIsFavoritesExpanded] = useState(true)
  const { favoriteIds, favoriteDeptNames, toggleFavorite, toggleFavoriteDept } = useFavorites({
    initialization: 'effect',
  })

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 200)

    return () => {
      window.clearTimeout(timer)
    }
  }, [searchQuery])

  const groupedTree = useMemo<DepartmentGroup[]>(() => {
    const grouped = new Map<string, Employee[]>()

    employees.forEach(employee => {
      const department = normalizeDepartment(employee.team)
      const currentGroup = grouped.get(department)
      if (!currentGroup) {
        grouped.set(department, [employee])
        return
      }
      currentGroup.push(employee)
    })

    return Array.from(grouped.entries())
      .sort(([deptA], [deptB]) => deptA.localeCompare(deptB, 'ja'))
      .map(([dept, members]) => ({
        dept,
        employees: [...members].sort((left, right) => {
          // 第1キー: 役職ランク（上位ほど先頭・役職なしは末尾）
          const rankDiff = resolvePositionRank(left) - resolvePositionRank(right)
          if (rankDiff !== 0) return rankDiff
          // 第2キー: 社員番号昇順（小さいほど先輩＝上位）。番号を解決できない社員は末尾へ送り、名前は使わず id で安定ソート
          const leftCode = resolveSortCode(left)
          const rightCode = resolveSortCode(right)
          if (leftCode !== null && rightCode !== null) {
            return leftCode - rightCode
          }
          if (leftCode !== null) return -1
          if (rightCode !== null) return 1
          return left.id.localeCompare(right.id, 'ja')
        }),
      }))
  }, [employees])

  const filteredTree = useMemo<DepartmentGroup[]>(() => {
    const query = debouncedQuery.trim()
    if (query.length === 0) return groupedTree
    const normalizedQuery = normalizeSearchText(query)

    return groupedTree
      .map(group => {
        const deptMatched = normalizeSearchText(group.dept).includes(normalizedQuery)
        if (deptMatched) {
          return group
        }

        // 判定は utils/employee-search に集約する(氏名・カナ・部署を横断)
        const matchedEmployees = group.employees.filter(employee =>
          matchesEmployeeQuery(employee, query)
        )

        return {
          dept: group.dept,
          employees: matchedEmployees,
        }
      })
      .filter(group => group.employees.length > 0)
  }, [debouncedQuery, groupedTree])

  // 自分の所属部署名を特定（未所属・未ログインはピン対象外）
  const pinnedDept = useMemo(() => {
    if (!currentUserId) return null
    const me = employees.find(employee => employee.id === currentUserId)
    if (!me) return null
    const dept = normalizeDepartment(me.team)
    return dept === UNASSIGNED_DEPARTMENT ? null : dept
  }, [employees, currentUserId])

  // マイ部署ピン用グループ（検索中は通常リストに委ねて非表示）
  const pinnedGroup = useMemo<DepartmentGroup | null>(() => {
    if (!pinnedDept) return null
    if (debouncedQuery.trim().length > 0) return null
    return groupedTree.find(group => group.dept === pinnedDept) ?? null
  }, [pinnedDept, groupedTree, debouncedQuery])

  // お気に入りセクションの内容（検索条件に関係なく常時表示）
  const favoritesContent = useMemo<FavoritesContent | null>(() => {
    const departments = groupedTree.filter(group => favoriteDeptNames.has(group.dept))
    const favoriteEmployees =
      favoriteIds.size === 0 ? [] : employees.filter(employee => favoriteIds.has(employee.id))

    if (departments.length === 0 && favoriteEmployees.length === 0) return null

    return {
      departments,
      employees: favoriteEmployees,
    }
  }, [groupedTree, favoriteDeptNames, favoriteIds, employees])

  useEffect(() => {
    const query = debouncedQuery.trim()
    if (query.length === 0) {
      // 検索語の変化に対する展開状態のリセット。ユーザーが個別に開閉もできるので純粋な派生値にはできない
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedDepts(new Set())
      return
    }

    setExpandedDepts(new Set(filteredTree.map(group => group.dept)))
  }, [debouncedQuery, filteredTree])

  const toggleDept = useCallback((dept: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev)
      if (next.has(dept)) {
        next.delete(dept)
      } else {
        next.add(dept)
      }
      return next
    })
  }, [])

  const togglePinned = useCallback(() => {
    setIsPinnedExpanded(prev => !prev)
  }, [])

  const toggleFavoritesExpanded = useCallback(() => {
    setIsFavoritesExpanded(prev => !prev)
  }, [])

  return {
    searchQuery,
    setSearchQuery,
    filteredTree,
    pinnedGroup,
    isPinnedExpanded,
    togglePinned,
    expandedDepts,
    toggleDept,
    favoriteIds,
    favoriteDeptNames,
    isFavoritesExpanded,
    favoritesContent,
    toggleFavorite,
    toggleFavoriteDept,
    toggleFavoritesExpanded,
  }
}
