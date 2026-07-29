import { EmployeeCard } from './EmployeeCard'
import type { AvatarConfig, Employee } from '@/lib/types'
import type { DeptGroup, DirectoryFavorites } from '../type'

// 部署1件の折りたたみ行と、展開時の社員カード一覧

type Props = {
  group: DeptGroup
  expanded: boolean
  favorites: DirectoryFavorites
  deptNameOf: (employee: Employee) => string
  resolveAvatar: (empId: string, fallback: AvatarConfig) => AvatarConfig
  onToggleExpand: (teamName: string) => void
  onSelectEmployee: (employee: Employee) => void
}

export const DeptGroupRow = ({
  group,
  expanded,
  favorites,
  deptNameOf,
  resolveAvatar,
  onToggleExpand,
  onSelectEmployee,
}: Props) => {
  const isFavDept = favorites.deptNames.has(group.teamName)

  return (
    <div className='emp-dir-group'>
      <div className='emp-dir-group-row' role='treeitem' aria-expanded={expanded} aria-selected={false}>
        <button type='button' className='emp-dir-group-toggle' onClick={() => onToggleExpand(group.teamName)}>
          <span className={`emp-dir-chevron${expanded ? ' is-expanded' : ''}`}>▶</span>
          <span className='emp-dir-group-name'>{group.teamName}</span>
        </button>
        <button
          type='button'
          className='emp-dir-fav-zone'
          aria-label={isFavDept ? 'お気に入り部署から外す' : 'お気に入り部署に追加'}
          aria-pressed={isFavDept}
          onClick={() => favorites.toggleDept(group.teamName)}
        >
          <span className={`emp-dir-star${isFavDept ? ' is-active' : ''}`}>★</span>
        </button>
        <span className='emp-dir-group-count'>({group.members.length})</span>
      </div>
      {expanded && (
        <div className='emp-dir-group-members'>
          {group.members.map((emp) => (
            <EmployeeCard
              key={emp.id}
              employee={emp}
              deptName={deptNameOf(emp)}
              avatar={resolveAvatar(emp.id, emp.avatar)}
              isFavorite={favorites.employeeIds.has(emp.id)}
              onSelect={onSelectEmployee}
              onToggleFavorite={favorites.toggleEmployee}
            />
          ))}
        </div>
      )}
    </div>
  )
}
