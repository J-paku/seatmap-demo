import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PixelAvatar } from './PixelAvatar'
import { useBodyScrollLock } from '@/lib/use-body-scroll-lock'
import { useSwipeDismiss } from '@/lib/use-swipe-dismiss'
import { useEmployees, useSeats, useTeams } from '@/lib/mock-loader'
import { normalizeForSearch } from '@/lib/kana'
import { useSelfAvatar } from '@/lib/self-avatar-context'
import type { Employee, Seat, Team } from '@/lib/types'

// 05: 本人社員id(デモ固定)。マイ部署ピン・本人カード強調・フッターに共用
const SELF_EMPLOYEE_ID = 'emp-001'
const UNASSIGNED_GROUP = '未所属'
const DEBOUNCE_MS = 200

type Props = {
  isOpen: boolean
  onClose: () => void
  onSelectEmployee: (employee: Employee, seat: Seat | null) => void
  onOpenAvatarEditor: () => void
}

// 職位ランク(部長→課長→職位なし)。第2キーは id 昇順で安定ソート
const roleRank = (position?: string): number => {
  if (position === '部長') return 0
  if (position === '課長') return 1
  return 2
}

type DeptGroup = {
  teamName: string
  // 部署名の読み(全角カタカナ)。かな検索でグループごと引っ掛けるための検索用フィールド(未所属は空文字)
  teamKana: string
  members: Employee[]
}

// テンプレ: teamId→Team を解決し、teams.json 定義順+末尾「未所属」でグループ化
const buildGroups = (employees: Employee[], teams: Team[]): DeptGroup[] => {
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

export const EmployeeDirectory = ({ isOpen, onClose, onSelectEmployee, onOpenAvatarEditor }: Props) => {
  const { data: employees } = useEmployees()
  const { data: teams } = useTeams()
  const { data: seats } = useSeats()
  const { resolveAvatar } = useSelfAvatar()

  // 閉じアニメーション(200ms)完了までマウント維持
  const [isVisible, setIsVisible] = useState(isOpen)
  const [isClosing, setIsClosing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set())
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(true)
  const [isFavoritesExpanded, setIsFavoritesExpanded] = useState(true)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [favoriteDeptNames, setFavoriteDeptNames] = useState<Set<string>>(new Set())

  const treeRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef(0)

  const { sheetRef: panelRef, bind } = useSwipeDismiss({ onClose, scrollGateRef: treeRef })

  useBodyScrollLock(isVisible)

  // isOpen の変化を state で追跡し、レンダー中に調整(ref を使わない React 公式パターン)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) {
      setIsVisible(true)
      setIsClosing(false)
    } else if (isVisible) {
      setIsClosing(true)
    }
  }

  // 閉じるアニメーション完了(200ms)後にアンマウント。タイマー購読のみを行う副作用
  useEffect(() => {
    if (!isClosing) return
    const id = window.setTimeout(() => {
      setIsVisible(false)
      setIsClosing(false)
      // 再オープン時は初期状態(検索語・展開状態は保持しなくてよい仕様)
      setSearchQuery('')
      setDebouncedQuery('')
      setExpandedDepts(new Set())
      setIsPinnedExpanded(true)
    }, 200)
    return () => window.clearTimeout(id)
  }, [isClosing])

  // 検索デバウンス(200ms)
  useEffect(() => {
    window.clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = window.setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(debounceTimerRef.current)
  }, [searchQuery])

  // 表示された瞬間にリストのスクロールを先頭へ戻す
  useEffect(() => {
    if (!isVisible) return
    if (treeRef.current) treeRef.current.scrollTop = 0
  }, [isVisible])

  // 出現直後にフォーカス(閉じるボタン優先・モバイルは検索欄)
  useEffect(() => {
    if (!isVisible || isClosing) return
    const id = requestAnimationFrame(() => {
      ;(closeBtnRef.current ?? searchInputRef.current)?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [isVisible, isClosing])

  // フォーカストラップ+Escape
  useEffect(() => {
    if (!isVisible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const root = panelRef.current
      if (!root) return
      const items = [...root.querySelectorAll<HTMLElement>('button:not([disabled]),input')].filter(
        (el) => el.offsetParent !== null
      )
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const activeEl = document.activeElement as HTMLElement | null
      if (e.shiftKey && activeEl === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isVisible, onClose])

  const teamNameById = useMemo(() => new Map((teams ?? []).map((t) => [t.id, t.name])), [teams])

  const seatByEmployeeId = useMemo(() => {
    const map = new Map<string, Seat>()
    for (const seat of seats ?? []) {
      if (seat.employeeId) map.set(seat.employeeId, seat)
    }
    return map
  }, [seats])

  const allGroups = useMemo(
    () => buildGroups(employees ?? [], teams ?? []),
    [employees, teams]
  )

  const selfEmployee = useMemo(
    () => (employees ?? []).find((e) => e.id === SELF_EMPLOYEE_ID) ?? null,
    [employees]
  )

  const selfTeamName = selfEmployee ? teamNameById.get(selfEmployee.teamId) ?? UNASSIGNED_GROUP : null

  const normalizedQuery = useMemo(() => normalizeForSearch(debouncedQuery), [debouncedQuery])
  const isSearching = normalizedQuery.length > 0

  // 検索フィルタ適用後のグループ(部署名ヒットは全員維持・非ヒットは社員単位フィルタ)
  const filteredGroups = useMemo(() => {
    if (!isSearching) return allGroups
    const result: DeptGroup[] = []
    for (const group of allGroups) {
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
  }, [allGroups, isSearching, normalizedQuery])

  // 検索確定(debouncedQuery 変化)時: ヒット全グループを自動展開。クリア時: 全接続復帰(空 Set)
  const [prevDebouncedQuery, setPrevDebouncedQuery] = useState(debouncedQuery)
  if (prevDebouncedQuery !== debouncedQuery) {
    setPrevDebouncedQuery(debouncedQuery)
    if (isSearching) {
      setExpandedDepts(new Set(filteredGroups.map((g) => g.teamName)))
    } else {
      setExpandedDepts(new Set())
    }
  }

  const favoriteMembers = useMemo(() => {
    const ids = favoriteIds
    const names = favoriteDeptNames
    const members: Employee[] = []
    const seen = new Set<string>()
    for (const group of allGroups) {
      const inFavDept = names.has(group.teamName)
      for (const emp of group.members) {
        if ((inFavDept || ids.has(emp.id)) && !seen.has(emp.id)) {
          seen.add(emp.id)
          members.push(emp)
        }
      }
    }
    return members
  }, [allGroups, favoriteIds, favoriteDeptNames])

  const hasFavorites = favoriteMembers.length > 0

  const toggleDept = useCallback((teamName: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev)
      if (next.has(teamName)) next.delete(teamName)
      else next.add(teamName)
      return next
    })
  }, [])

  const toggleFavoriteEmployee = useCallback((empId: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (next.has(empId)) next.delete(empId)
      else next.add(empId)
      return next
    })
  }, [])

  const toggleFavoriteDept = useCallback((teamName: string) => {
    setFavoriteDeptNames((prev) => {
      const next = new Set(prev)
      if (next.has(teamName)) next.delete(teamName)
      else next.add(teamName)
      return next
    })
  }, [])

  const handleSelectEmployee = useCallback(
    (emp: Employee) => {
      const seat = seatByEmployeeId.get(emp.id) ?? null
      onSelectEmployee(emp, seat)
    },
    [seatByEmployeeId, onSelectEmployee]
  )

  if (!isVisible) return null

  const emptyResult = isSearching && filteredGroups.length === 0

  const renderEmployeeCard = (emp: Employee) => {
    const isSelf = emp.id === SELF_EMPLOYEE_ID
    const isFav = favoriteIds.has(emp.id)
    const deptName = teamNameById.get(emp.teamId) ?? UNASSIGNED_GROUP
    return (
      <div key={emp.id} className={`emp-dir-card${isSelf ? ' is-self' : ''}`} role='treeitem' aria-selected={false}>
        <button
          type='button'
          className='emp-dir-card-main'
          onClick={() => handleSelectEmployee(emp)}
        >
          <span className='emp-dir-avatar-tile'>
            <PixelAvatar config={resolveAvatar(emp.id, emp.avatar)} size={32} />
          </span>
          <span className='emp-dir-card-text'>
            <span className='emp-dir-card-name'>{emp.name}</span>
            {emp.position && <span className='emp-dir-card-position'>{emp.position}</span>}
            <span className='emp-dir-card-dept'>{deptName}</span>
          </span>
        </button>
        <button
          type='button'
          className='emp-dir-fav-zone'
          aria-label={isFav ? 'お気に入りから外す' : 'お気に入りに追加'}
          aria-pressed={isFav}
          onClick={() => toggleFavoriteEmployee(emp.id)}
        >
          <span className={`emp-dir-star${isFav ? ' is-active' : ''}`}>★</span>
        </button>
      </div>
    )
  }

  const renderDeptGroup = (group: DeptGroup, expandedSet: Set<string>, onToggle: (name: string) => void) => {
    const expanded = expandedSet.has(group.teamName)
    const isFavDept = favoriteDeptNames.has(group.teamName)
    return (
      <div key={group.teamName} className='emp-dir-group'>
        <div
          className='emp-dir-group-row'
          role='treeitem'
          aria-expanded={expanded}
          aria-selected={false}
        >
          <button
            type='button'
            className='emp-dir-group-toggle'
            onClick={() => onToggle(group.teamName)}
          >
            <span className={`emp-dir-chevron${expanded ? ' is-expanded' : ''}`}>▶</span>
            <span className='emp-dir-group-name'>{group.teamName}</span>
          </button>
          <button
            type='button'
            className='emp-dir-fav-zone'
            aria-label={isFavDept ? 'お気に入り部署から外す' : 'お気に入り部署に追加'}
            aria-pressed={isFavDept}
            onClick={() => toggleFavoriteDept(group.teamName)}
          >
            <span className={`emp-dir-star${isFavDept ? ' is-active' : ''}`}>★</span>
          </button>
          <span className='emp-dir-group-count'>({group.members.length})</span>
        </div>
        {expanded && (
          <div className='emp-dir-group-members'>{group.members.map((emp) => renderEmployeeCard(emp))}</div>
        )}
      </div>
    )
  }

  const pinnedGroup = !isSearching && selfTeamName ? allGroups.find((g) => g.teamName === selfTeamName) : null

  return (
    <>
      <div className={`emp-dir-backdrop${isClosing ? ' is-closing' : ''}`} onClick={onClose} />
      <div
        ref={panelRef}
        className={`emp-dir-panel${isClosing ? ' is-closing' : ''}`}
        role='dialog'
        aria-modal='true'
        aria-label='社員ディレクトリ'
        {...bind}
      >
        <div className='emp-dir-handle-strip' data-handle='true'>
          <span className='emp-dir-handle-bar' data-handle='true' />
        </div>

        <div className='emp-dir-header'>
          <div className='emp-dir-search-wrap'>
            <span className='emp-dir-search-icon'>⌕</span>
            <input
              ref={searchInputRef}
              type='text'
              role='searchbox'
              aria-label='社員を検索'
              placeholder='社員を検索...'
              className='emp-dir-search-input'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery.length > 0 && (
              <button
                type='button'
                className='emp-dir-search-clear'
                aria-label='検索をクリア'
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>
          <button
            ref={closeBtnRef}
            type='button'
            className='emp-dir-close-btn'
            aria-label='閉じる'
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div ref={treeRef} className='emp-dir-tree' role='tree' aria-label='部署と社員ツリー'>
          {emptyResult ? (
            <p className='emp-dir-empty'>該当する社員がいません</p>
          ) : (
            <>
              {hasFavorites && (
                <div className='emp-dir-favorites-section'>
                  <button
                    type='button'
                    className='emp-dir-section-label'
                    onClick={() => setIsFavoritesExpanded((v) => !v)}
                  >
                    <span className={`emp-dir-chevron${isFavoritesExpanded ? ' is-expanded' : ''}`}>▶</span>
                    <span className='emp-dir-star is-active'>★</span>
                    <span>お気に入り</span>
                    <span className='emp-dir-group-count'>({favoriteMembers.length})</span>
                  </button>
                  {isFavoritesExpanded && (
                    <div className='emp-dir-group-members'>
                      {favoriteMembers.map((emp) => renderEmployeeCard(emp))}
                    </div>
                  )}
                </div>
              )}

              {pinnedGroup && (
                <div className='emp-dir-pinned-section'>
                  <div className='emp-dir-section-label emp-dir-pin-label'>
                    <span className='emp-dir-pin-icon'>📌</span>
                    <span>マイ部署</span>
                  </div>
                  {renderDeptGroup(
                    pinnedGroup,
                    isPinnedExpanded ? new Set([pinnedGroup.teamName]) : new Set(),
                    () => setIsPinnedExpanded((v) => !v)
                  )}
                </div>
              )}

              <div className='emp-dir-all-section'>
                {!isSearching && <div className='emp-dir-section-label'>全ての部署</div>}
                {filteredGroups.map((group) => renderDeptGroup(group, expandedDepts, toggleDept))}
              </div>
            </>
          )}
        </div>

        <div className='emp-dir-footer'>
          {selfEmployee && (
            <button type='button' className='emp-dir-footer-avatar' onClick={onOpenAvatarEditor}>
              <PixelAvatar config={resolveAvatar(selfEmployee.id, selfEmployee.avatar)} size={28} />
              <span className='emp-dir-footer-name'>{selfEmployee.name}</span>
            </button>
          )}
          <button type='button' className='emp-dir-footer-settings' disabled>
            設定
          </button>
        </div>
      </div>
    </>
  )
}
