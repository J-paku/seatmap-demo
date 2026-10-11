import { PixelAvatar } from '@/components/PixelAvatar'
import { useEmployeeAvatar } from '@/hooks/use-employee-avatar'
import type { Employee } from '@/types'
import styles from '@/components/object-picker.module.css'

// 単体検索の候補1行。押すとその社員を選ぶ。着席中なら座席IDを添え、行末のアイコンで移動か新規配属かを示す

export const CandidateRow = ({
  employee,
  seatedAt,
  onSelect,
}: {
  employee: Employee
  seatedAt: string | null
  onSelect: () => void
}) => {
  const avatar = useEmployeeAvatar(employee)
  return (
    <button type='button' className={styles.assignRow} onClick={onSelect}>
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
      {/* §06-4: 行末尾アイコン。配属済み=swap_horiz(選ぶと移動) / 未配属=add_circle(選ぶと新規配属) */}
      <span
        className='icon-msr-thin'
        aria-hidden='true'
        style={{
          marginLeft: seatedAt ? 6 : 'auto',
          color: 'var(--color-text-secondary)',
          fontSize: 20,
        }}
      >
        {seatedAt ? 'swap_horiz' : 'add_circle'}
      </span>
    </button>
  )
}
