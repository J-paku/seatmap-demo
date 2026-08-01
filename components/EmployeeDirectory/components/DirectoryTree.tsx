import { useState } from 'react'
import { DeptGroupRow } from './DeptGroupRow'
import { EmployeeCard } from './EmployeeCard'
import type { Employee } from '@/types'
import type { DeptGroup, DirectoryFavorites } from '../type'

// お気に入り → マイ部署ピン → 全ての部署 の順に並ぶツリー本体

type Props = {
  groups: DeptGroup[]
  pinnedGroup: DeptGroup | null
  expandedDepts: Set<string>
  favorites: DirectoryFavorites
  isSearching: boolean
  isEmptyResult: boolean
  deptNameOf: (employee: Employee) => string
  onToggleDept: (teamName: string) => void
  onSelectEmployee: (employee: Employee) => void
}

export const DirectoryTree = ({
  groups,
  pinnedGroup,
  expandedDepts,
  favorites,
  isSearching,
  isEmptyResult,
  deptNameOf,
  onToggleDept,
  onSelectEmployee,
}: Props) => {
  const [isFavoritesExpanded, setIsFavoritesExpanded] = useState(true)
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(true)

  if (isEmptyResult) return <p className='emp-dir-empty'>該当する社員がいません</p>

  return (
    <>
      {favorites.members.length > 0 && (
        <div className='emp-dir-favorites-section'>
          <button type='button' className='emp-dir-section-label' onClick={() => setIsFavoritesExpanded((v) => !v)}>
            <span className={`emp-dir-chevron${isFavoritesExpanded ? ' is-expanded' : ''}`}>▶</span>
            <span className='emp-dir-star is-active'>★</span>
            <span>お気に入り</span>
            <span className='emp-dir-group-count'>({favorites.members.length})</span>
          </button>
          {isFavoritesExpanded && (
            <div className='emp-dir-group-members'>
              {favorites.members.map((emp) => (
                <EmployeeCard
                  key={emp.id}
                  employee={emp}
                  deptName={deptNameOf(emp)}
                  isFavorite={favorites.employeeIds.has(emp.id)}
                  onSelect={onSelectEmployee}
                  onToggleFavorite={favorites.toggleEmployee}
                />
              ))}
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
          <DeptGroupRow
            group={pinnedGroup}
            expanded={isPinnedExpanded}
            favorites={favorites}
            deptNameOf={deptNameOf}
            onToggleExpand={() => setIsPinnedExpanded((v) => !v)}
            onSelectEmployee={onSelectEmployee}
          />
        </div>
      )}

      <div className='emp-dir-all-section'>
        {!isSearching && <div className='emp-dir-section-label'>全ての部署</div>}
        {groups.map((group) => (
          <DeptGroupRow
            key={group.teamName}
            group={group}
            expanded={expandedDepts.has(group.teamName)}
            favorites={favorites}
            deptNameOf={deptNameOf}
            onToggleExpand={onToggleDept}
            onSelectEmployee={onSelectEmployee}
          />
        ))}
      </div>
    </>
  )
}
