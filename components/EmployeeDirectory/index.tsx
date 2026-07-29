import { useCallback, useMemo, useRef, useState } from 'react'
import { DirectoryFooter } from './components/DirectoryFooter'
import { DirectoryHeader } from './components/DirectoryHeader'
import { DirectoryTree } from './components/DirectoryTree'
import { useDebouncedQuery } from './hooks/use-debounced-query'
import { useDirectoryFavorites } from './hooks/use-directory-favorites'
import { useDirectoryFocus } from './hooks/use-directory-focus'
import { usePanelVisibility } from './hooks/use-panel-visibility'
import { buildGroups } from './utils/build-groups'
import { UNASSIGNED_GROUP } from './utils/directory-constants'
import { SELF_EMPLOYEE_ID } from '@/utils/demo-identity'
import { filterGroups } from './utils/filter-groups'
import type { EmployeeDirectoryProps } from './type'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { useSwipeDismiss } from '@/hooks/use-swipe-dismiss'
import { useEmployees, useSeats, useTeams } from '@/lib/mock-loader'
import { normalizeForSearch } from '@/utils/kana'
import { useSelfAvatar } from '@/contexts/self-avatar-context'
import type { Employee, Seat } from '@/types'

// 05: 部署ツリー + かな検索 + お気に入りの社員ディレクトリ

type Props = EmployeeDirectoryProps

export const EmployeeDirectory = ({ isOpen, onClose, onSelectEmployee, onOpenAvatarEditor }: Props) => {
  const { data: employees } = useEmployees()
  const { data: teams } = useTeams()
  const { data: seats } = useSeats()
  const { resolveAvatar } = useSelfAvatar()

  const [searchQuery, setSearchQuery] = useState('')
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set())
  const debouncedQuery = useDebouncedQuery(searchQuery)

  const treeRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 再オープン時は初期状態(検索語・展開状態は保持しなくてよい仕様)
  const resetOnClose = useCallback(() => {
    setSearchQuery('')
    setExpandedDepts(new Set())
  }, [])
  const { isVisible, isClosing } = usePanelVisibility(isOpen, resetOnClose)

  const { sheetRef: panelRef, bind } = useSwipeDismiss({ onClose, scrollGateRef: treeRef })
  useBodyScrollLock(isVisible)
  useDirectoryFocus({ isVisible, isClosing, panelRef, treeRef, closeBtnRef, searchInputRef, onClose })

  const teamNameById = useMemo(() => new Map((teams ?? []).map((t) => [t.id, t.name])), [teams])
  const seatByEmployeeId = useMemo(() => {
    const map = new Map<string, Seat>()
    for (const seat of seats ?? []) {
      if (seat.employeeId) map.set(seat.employeeId, seat)
    }
    return map
  }, [seats])

  const allGroups = useMemo(() => buildGroups(employees ?? [], teams ?? []), [employees, teams])
  const favorites = useDirectoryFavorites(allGroups)

  const selfEmployee = useMemo(
    () => (employees ?? []).find((e) => e.id === SELF_EMPLOYEE_ID) ?? null,
    [employees]
  )
  const selfTeamName = selfEmployee ? teamNameById.get(selfEmployee.teamId) ?? UNASSIGNED_GROUP : null

  const normalizedQuery = useMemo(() => normalizeForSearch(debouncedQuery), [debouncedQuery])
  const isSearching = normalizedQuery.length > 0
  const filteredGroups = useMemo(() => filterGroups(allGroups, normalizedQuery), [allGroups, normalizedQuery])

  // 検索確定(debouncedQuery 変化)時: ヒット全グループを自動展開。クリア時: 全接続復帰(空 Set)
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

  const handleSelectEmployee = useCallback(
    (emp: Employee) => onSelectEmployee(emp, seatByEmployeeId.get(emp.id) ?? null),
    [seatByEmployeeId, onSelectEmployee]
  )

  const deptNameOf = useCallback(
    (emp: Employee) => teamNameById.get(emp.teamId) ?? UNASSIGNED_GROUP,
    [teamNameById]
  )

  if (!isVisible) return null

  const pinnedGroup = !isSearching && selfTeamName ? allGroups.find((g) => g.teamName === selfTeamName) ?? null : null

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

        <DirectoryHeader
          query={searchQuery}
          searchInputRef={searchInputRef}
          closeBtnRef={closeBtnRef}
          onChangeQuery={setSearchQuery}
          onClose={onClose}
        />

        <div ref={treeRef} className='emp-dir-tree' role='tree' aria-label='部署と社員ツリー'>
          <DirectoryTree
            groups={filteredGroups}
            pinnedGroup={pinnedGroup}
            expandedDepts={expandedDepts}
            favorites={favorites}
            isSearching={isSearching}
            isEmptyResult={isSearching && filteredGroups.length === 0}
            deptNameOf={deptNameOf}
            resolveAvatar={resolveAvatar}
            onToggleDept={toggleDept}
            onSelectEmployee={handleSelectEmployee}
          />
        </div>

        <DirectoryFooter
          selfEmployee={selfEmployee}
          selfAvatar={selfEmployee ? resolveAvatar(selfEmployee.id, selfEmployee.avatar) : null}
          onOpenAvatarEditor={onOpenAvatarEditor}
        />
      </div>
    </>
  )
}
