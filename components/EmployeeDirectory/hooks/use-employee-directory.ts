// 社員ディレクトリの検索・展開・座席解決状態を管理するフック
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Employee, Seat } from '@/types'
import { normalizeName } from '@/lib/seat/display-utils'
import { useFavorites } from '@/hooks/use-favorites'
import type { FavoritesContent } from '../components/DepartmentTree/types'

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
  handleEmployeeTap: (emp: Employee) => { seat: Seat } | null
  favoriteIds: Set<string>
  favoriteDeptNames: Set<string>
  isFavoritesExpanded: boolean
  favoritesContent: FavoritesContent | null
  toggleFavorite: (empId: string) => void
  toggleFavoriteDept: (dept: string) => void
  toggleFavoritesExpanded: () => void
}

const UNASSIGNED_DEPARTMENT = '未所属'

const normalizeDepartment = (team: string) => {
  const trimmed = team.trim()
  return trimmed.length > 0 ? trimmed : UNASSIGNED_DEPARTMENT
}

// 並び替え用の社員番号を解決（数値が小さいほど先輩 → 昇順で上位に並ぶ）
// 第一に ownerCode（UserCode 由来の整形済み社員番号）を使用。メール形式 LoginId のパースは不安定なため未取得時のみフォールバック
// LoginId はメール形式 (例: jp7508@koyama-kk.co.jp) のため @ 前のローカル部から連続4桁以上の数字を抽出する
// 桁数増加 (番号枯渇対策) に備えて数値で返し、抽出不可の社員は null で末尾へ送る
const resolveSortCode = (employee: Employee): number | null => {
  const fromOwnerCode = employee.ownerCode?.match(/\d+/)?.[0]
  if (fromOwnerCode) return Number(fromOwnerCode)
  const localPart = employee.email?.split('@')[0]
  const matched = localPart?.match(/\d{4,}/)
  return matched ? Number(matched[0]) : null
}

// 役職ランク（上位ほど先頭）。employee.position は役職マスター(ClassA=役職区分, SiteId=5026620)由来の正確な文字列のため完全一致で突合する
// 一般職員以下（一般職員/特定職/嘱託/契約/パート/その他）は getPositions 側で除外済みのため、ここには管理職役職のみが到達する
// 一覧に無い役職は「役職ありの末尾」へ送り、同ランク内は社員番号で決める
const POSITION_RANK_ORDER = [
  '代表取締役会長',
  '取締役会長',
  '代表取締役社長',
  '取締役副社長執行役員',
  '取締役専務執行役員',
  '取締役常務執行役員',
  '取締役執行役員',
  '取締役相談役',
  '相談役',
  '取締役シニアフェロー',
  '監査役',
  '顧問',
  '執行役員本部長',
  '執行役員事業部長',
  '執行役員統括部長',
  '執行役員部長',
  '執行役員支店長',
  'スーパーバイザー',
  '本部長',
  '事業部長',
  '統括部長',
  '部長',
  '支店長',
  '室長',
  '次長',
  '課長',
  '所長',
  '課長代理（管理職）',
  '所長代理（管理職）',
  '課長代理（組合員）',
  '所長代理（組合員）',
  '参与',
  '係長',
  '主任',
  '副主任',
  'チームリーダー',
]

// 役職の優先度を数値化する。役職なし=最下位、役職ありで一覧外=既知役職の直後
// Infinity は役職なし同士の減算が NaN になり比較器が壊れる（第2キーの社員番号比較に到達しない）ため有限値を使う
const resolvePositionRank = (employee: Employee): number => {
  const position = employee.position?.trim()
  if (!position) return POSITION_RANK_ORDER.length + 1
  const index = POSITION_RANK_ORDER.indexOf(position)
  return index >= 0 ? index : POSITION_RANK_ORDER.length
}

export function useEmployeeDirectory(
  employees: Employee[],
  seats: Seat[],
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
    const query = debouncedQuery.trim().toLowerCase()
    if (query.length === 0) return groupedTree

    return groupedTree
      .map(group => {
        const deptMatched = group.dept.toLowerCase().includes(query)
        if (deptMatched) {
          return group
        }

        const matchedEmployees = group.employees.filter(employee =>
          employee.name.toLowerCase().includes(query)
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

  const handleEmployeeTap = useCallback(
    (employee: Employee) => {
      // デモの Seat は employeeId 参照型。ID 一致を優先し、無ければ名前(空白正規化)でフォールバック
      const byId = seats.find(seat => seat.employeeId === employee.id)
      if (byId) return { seat: byId }
      const normalizedName = normalizeName(employee.name)
      const byName = seats.find(seat => {
        const seated = seat.employeeId
          ? employees.find(candidate => candidate.id === seat.employeeId)
          : undefined
        return seated !== undefined && normalizeName(seated.name) === normalizedName
      })
      if (byName) return { seat: byName }
      return null
    },
    [seats, employees]
  )

  return {
    searchQuery,
    setSearchQuery,
    filteredTree,
    pinnedGroup,
    isPinnedExpanded,
    togglePinned,
    expandedDepts,
    toggleDept,
    handleEmployeeTap,
    favoriteIds,
    favoriteDeptNames,
    isFavoritesExpanded,
    favoritesContent,
    toggleFavorite,
    toggleFavoriteDept,
    toggleFavoritesExpanded,
  }
}
