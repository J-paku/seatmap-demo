import { PixelAvatar } from '@/components/PixelAvatar'
import { SELF_EMPLOYEE_ID } from '../utils/directory-constants'
import type { AvatarConfig, Employee } from '@/lib/types'

// 社員1件のカード。本文タップで詳細・右端の★でお気に入り

type Props = {
  employee: Employee
  deptName: string
  avatar: AvatarConfig
  isFavorite: boolean
  onSelect: (employee: Employee) => void
  onToggleFavorite: (empId: string) => void
}

export const EmployeeCard = ({ employee, deptName, avatar, isFavorite, onSelect, onToggleFavorite }: Props) => (
  <div
    className={`emp-dir-card${employee.id === SELF_EMPLOYEE_ID ? ' is-self' : ''}`}
    role='treeitem'
    aria-selected={false}
  >
    <button type='button' className='emp-dir-card-main' onClick={() => onSelect(employee)}>
      <span className='emp-dir-avatar-tile'>
        <PixelAvatar config={avatar} size={32} />
      </span>
      <span className='emp-dir-card-text'>
        <span className='emp-dir-card-name'>{employee.name}</span>
        {employee.position && <span className='emp-dir-card-position'>{employee.position}</span>}
        <span className='emp-dir-card-dept'>{deptName}</span>
      </span>
    </button>
    <button
      type='button'
      className='emp-dir-fav-zone'
      aria-label={isFavorite ? 'お気に入りから外す' : 'お気に入りに追加'}
      aria-pressed={isFavorite}
      onClick={() => onToggleFavorite(employee.id)}
    >
      <span className={`emp-dir-star${isFavorite ? ' is-active' : ''}`}>★</span>
    </button>
  </div>
)
