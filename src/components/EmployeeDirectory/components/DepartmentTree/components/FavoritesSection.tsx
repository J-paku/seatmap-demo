// お気に入りセクション（登録済みの社員と部署を表示する専用ブロック）
import { useState } from 'react'
import type { FavoritesContent } from '../types'
import type { Employee, PixelAvatarConfig } from '@/types'
import { EmployeeCard } from './EmployeeCard'
import { DepartmentGroupRow } from './DepartmentGroupRow'
import { triggerHaptic } from '@/utils/haptic'

interface FavoritesSectionProps {
  favoritesContent: FavoritesContent | null
  isFavoritesExpanded: boolean
  onToggleFavoritesExpanded: () => void
  currentUserId?: string
  onEmployeeTap: (employee: Employee) => void
  onToggleFavorite: (empId: string) => void
  onToggleFavoriteDept: (dept: string) => void
  favoriteIds: Set<string>
  avatarConfigByOwnerCode: Map<string, PixelAvatarConfig>
}

function FavoritesSection({
  favoritesContent,
  isFavoritesExpanded,
  onToggleFavoritesExpanded,
  currentUserId,
  onEmployeeTap,
  onToggleFavorite,
  onToggleFavoriteDept,
  favoriteIds,
  avatarConfigByOwnerCode,
}: FavoritesSectionProps) {
  const [expandedFavoriteDepts, setExpandedFavoriteDepts] = useState<Set<string>>(new Set())

  if (!favoritesContent) {
    return null
  }

  const totalCount = favoritesContent.departments.length + favoritesContent.employees.length

  const toggleExpandedDept = (dept: string) => {
    const newSet = new Set(expandedFavoriteDepts)
    if (newSet.has(dept)) {
      newSet.delete(dept)
    } else {
      newSet.add(dept)
    }
    setExpandedFavoriteDepts(newSet)
  }

  return (
    <div className='mb-2'>
      <div
        className='overflow-hidden rounded-lg border-l-2'
        style={{ borderLeftColor: 'var(--color-accent)' }}
      >
        <button
          type='button'
          role='treeitem'
          aria-selected={false}
          aria-expanded={isFavoritesExpanded}
          onClick={() => {
            triggerHaptic('light')
            onToggleFavoritesExpanded()
          }}
          className='flex min-h-11 w-full items-center gap-2 px-2 text-left'
          style={{
            backgroundColor: 'var(--color-accent-soft)',
            color: 'var(--color-text-primary)',
          }}
        >
          <span className='icon-msr-filled text-[20px] leading-none' aria-hidden='true'>
            {isFavoritesExpanded ? 'expand_more' : 'chevron_right'}
          </span>
          <span
            className='icon-msr-filled text-[18px] leading-none'
            aria-hidden='true'
            style={{ color: 'var(--color-accent)' }}
          >
            star
          </span>
          <span className='text-sm font-semibold'>気に入り</span>
          <span className='ml-auto text-xs' style={{ color: 'var(--color-text-secondary)' }}>
            ({totalCount})
          </span>
        </button>
      </div>
      {isFavoritesExpanded ? (
        <div className='pl-7' role='group' aria-label='お気に入り部署と社員一覧'>
          {favoritesContent.departments.map(dept => (
            <DepartmentGroupRow
              key={dept.dept}
              group={dept}
              isExpanded={expandedFavoriteDepts.has(dept.dept)}
              onToggle={() => toggleExpandedDept(dept.dept)}
              onEmployeeTap={onEmployeeTap}
              currentUserId={currentUserId}
              isFavoriteDept
              favoriteIds={favoriteIds}
              onToggleFavorite={onToggleFavorite}
              onToggleFavoriteDept={onToggleFavoriteDept}
              avatarConfigByOwnerCode={avatarConfigByOwnerCode}
            />
          ))}
          {favoritesContent.employees.map(employee => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              currentUserId={currentUserId}
              isFavorite
              displayTeam={employee.team}
              onEmployeeTap={onEmployeeTap}
              onToggleFavorite={onToggleFavorite}
              avatarConfigByOwnerCode={avatarConfigByOwnerCode}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export { FavoritesSection }
