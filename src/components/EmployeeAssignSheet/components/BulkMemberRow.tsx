import { PixelAvatar } from '@/components/PixelAvatar'
import { useEmployeeAvatar } from '@/hooks/use-employee-avatar'
import type { Employee } from '@/types'
import styles from '@/components/object-picker.module.css'

// 一括選択の社員1行。チェックボックスで選ぶ。着席中なら座席IDを添える

export const BulkMemberRow = ({
  employee,
  seatedAt,
  isChecked,
  onToggle,
}: {
  employee: Employee
  seatedAt: string | null
  isChecked: boolean
  onToggle: () => void
}) => {
  const avatar = useEmployeeAvatar(employee)
  return (
    <label className={styles.assignRow} style={{ cursor: 'pointer' }}>
      <input
        type='checkbox'
        checked={isChecked}
        onChange={onToggle}
        style={{ width: 18, height: 18, flexShrink: 0 }}
      />
      {avatar && <PixelAvatar config={avatar} size={32} ariaLabel='' />}
      <span className={styles.assignRowText}>
        <span className={styles.assignRowName}>{employee.name}</span>
        <span className={styles.assignRowMeta}>
          {employee.position ? `${employee.position} / ` : ''}
          {employee.team}
        </span>
      </span>
      {seatedAt && (
        <span className={styles.assignRowSeated}>
          着席中
          <span className={styles.assignRowSeatId}>{seatedAt}</span>
        </span>
      )}
    </label>
  )
}
