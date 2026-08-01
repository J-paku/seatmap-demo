// 単一部署グループ（ヘッダー + 展開時の社員リスト）を描画
import type { DepartmentGroupRowProps } from '../types'
import { EmployeeCard } from './EmployeeCard'
import { triggerHaptic } from '@/lib/haptic'

function DepartmentGroupRow({
  group,
  isExpanded,
  onToggle,
  onEmployeeTap,
  currentUserId,
  isPinned,
  isFavoriteDept,
  favoriteIds,
  onToggleFavorite,
  onToggleFavoriteDept,
  avatarConfigByOwnerCode,
}: DepartmentGroupRowProps) {
  return (
    <div className='mb-1'>
      <button
        type='button'
        role='treeitem'
        aria-selected={false}
        aria-expanded={isExpanded}
        onClick={() => {
          triggerHaptic('light')
          onToggle()
        }}
        className='flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left'
        style={{ color: 'var(--color-text-primary)' }}
      >
        <span className='icon-msr-filled text-[20px] leading-none' aria-hidden='true'>
          {isExpanded ? 'expand_more' : 'chevron_right'}
        </span>
        {isPinned ? (
          <span
            className='icon-msr-filled text-[18px] leading-none'
            aria-hidden='true'
            style={{ color: 'var(--color-accent)' }}
          >
            push_pin
          </span>
        ) : null}
        <span className='text-sm font-semibold'>{group.dept}</span>
        {onToggleFavoriteDept ? (
          // button のネスト禁止 (HTML 仕様) のため span+role=button で代替。クリック/キーボード両対応
          <span
            role='button'
            tabIndex={0}
            aria-label={`${group.dept}をお気に入りに${isFavoriteDept ? '解除' : '登録'}`}
            onClick={e => {
              e.stopPropagation()
              triggerHaptic('light')
              onToggleFavoriteDept(group.dept)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                triggerHaptic('light')
                onToggleFavoriteDept(group.dept)
              }
            }}
            className='flex items-center justify-center'
            style={{ padding: '4px' }}
          >
            <span
              className='icon-msr-filled text-[18px] leading-none'
              aria-hidden='true'
              style={{
                color: isFavoriteDept ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              }}
            >
              {isFavoriteDept ? 'star' : 'star_border'}
            </span>
          </span>
        ) : null}
        <span className='ml-auto text-xs' style={{ color: 'var(--color-text-secondary)' }}>
          ({group.employees.length})
        </span>
      </button>

      {isExpanded ? (
        <div className='pl-7' role='group' aria-label={`${group.dept} 社員一覧`}>
          {group.employees.map(employee => {
            const isFavorite = favoriteIds.has(employee.id)

            return (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                currentUserId={currentUserId}
                isFavorite={isFavorite}
                displayTeam={group.dept}
                onEmployeeTap={onEmployeeTap}
                onToggleFavorite={onToggleFavorite}
                avatarConfigByOwnerCode={avatarConfigByOwnerCode}
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export { DepartmentGroupRow }

export default DepartmentGroupRow
