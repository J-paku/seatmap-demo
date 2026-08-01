// 共有の社員カード：部署一覧とお気に入り両セクションで使用
import type { Employee, PixelAvatarConfig } from '@/types'
import { useMyAvatarConfig } from '@/hooks/use-my-avatar-config'
import { formatPositionLabel } from '@/utils/position-label'
import { PixelAvatar } from '@/components/PixelAvatar'
import { triggerHaptic } from '@/lib/haptic'

interface EmployeeCardProps {
  employee: Employee
  currentUserId?: string
  isFavorite: boolean
  displayTeam: string
  onEmployeeTap: (employee: Employee) => void
  onToggleFavorite: (empId: string) => void
  avatarConfigByOwnerCode: Map<string, PixelAvatarConfig>
  isAlwaysFilled?: boolean
}

function EmployeeCard({
  employee,
  currentUserId,
  isFavorite,
  displayTeam,
  onEmployeeTap,
  onToggleFavorite,
  avatarConfigByOwnerCode,
  isAlwaysFilled,
}: EmployeeCardProps) {
  const isCurrentUser = currentUserId === employee.id
  const myAvatarConfig = useMyAvatarConfig()
  const isStarActive = isFavorite || isAlwaysFilled
  // お気に入り星はテーマアクセント色で統一（テーマごとに自動調和）
  const starColor = isStarActive
    ? 'var(--color-accent)'
    : 'var(--color-text-tertiary, var(--color-text-secondary))'
  const starIcon = isStarActive ? 'star' : 'star_border'
  // 末尾の区分接尾辞（（管理職）等）を除いた表示用役職名
  const positionLabel = formatPositionLabel(employee.position)
  const avatarConfig = isCurrentUser
    ? // 本人は共有アバターキャッシュを単一の真実とする（編集直後のstale回避でフォールバック無し）
      myAvatarConfig
    : // デモは avatars.json を単一ソースにしており Employee は設定を持たない
      ((employee.ownerCode ? avatarConfigByOwnerCode.get(employee.ownerCode) : null) ?? null)

  return (
    <div className='relative mt-1'>
      <button
        type='button'
        role='treeitem'
        aria-selected={isCurrentUser}
        onClick={() => {
          triggerHaptic('light')
          onEmployeeTap(employee)
        }}
        className='flex min-h-14 w-full items-center gap-3 text-left'
        style={{
          backgroundColor: isCurrentUser
            ? 'var(--color-accent-soft)'
            : 'var(--color-surface-elevated)',
          border: isCurrentUser ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
          borderRadius: 12,
          padding: '8px 48px 8px 8px',
          boxShadow: 'var(--shadow-card)',
          transition: 'background-color 140ms ease, border-color 140ms ease',
        }}
      >
        <span
          aria-hidden='true'
          className='shrink-0 inline-flex items-center justify-center'
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            backgroundColor: 'var(--color-surface-sunken)',
            boxShadow: 'inset 0 0 0 1px var(--color-border)',
          }}
        >
          <PixelAvatar config={avatarConfig} size={32} />
        </span>
        <div className='min-w-0'>
          <p
            className='truncate text-sm font-semibold'
            style={{ color: 'var(--color-text-primary)' }}
          >
            {employee.name}
          </p>
          {positionLabel && (
            // 役職はアクセント色で強調（氏名と部署の間・一般職員は未設定で非表示）
            <p className='truncate text-xs font-medium' style={{ color: 'var(--color-accent)' }}>
              {positionLabel}
            </p>
          )}
          <p className='truncate text-xs' style={{ color: 'var(--color-text-secondary)' }}>
            {displayTeam}
          </p>
        </div>
      </button>
      <button
        type='button'
        aria-label={`${employee.name}をお気に入りに${isFavorite ? '解除' : '登録'}`}
        onClick={e => {
          e.stopPropagation()
          triggerHaptic('light')
          onToggleFavorite(employee.id)
        }}
        className='absolute right-0 top-0 bottom-0 flex w-12 items-center justify-center rounded-r-[12px]'
      >
        <span
          key={starIcon}
          className={`icon-msr-filled text-[22px] leading-none${isStarActive ? ' favorite-star-pop' : ''}`}
          aria-hidden='true'
          style={{ color: starColor }}
        >
          {starIcon}
        </span>
      </button>
    </div>
  )
}

export { EmployeeCard }
