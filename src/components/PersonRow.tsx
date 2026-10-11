import { PixelAvatar } from '@/components/PixelAvatar'
import { useEmployeeAvatar } from '@/hooks/use-employee-avatar'
import type { Employee } from '@/types'
import styles from './person-row.module.css'

type Props = {
  employee: Employee
  onClick: (employeeId: string) => void
}

// 人物行: 32×32 アバター枠 + 氏名/役職/部署
// 席の有無に関わらずカードを開けるため、押せる/押せないを分けない
export const PersonRow = ({ employee, onClick }: Props) => {
  const avatarConfig = useEmployeeAvatar(employee)

  return (
    <button
      type='button'
      className={`${styles.personRow} ${styles.personRowClickable}`}
      onClick={() => onClick(employee.id)}
    >
      <span className={styles.avatarFrame}>
        <PixelAvatar config={avatarConfig} size={28} />
      </span>
      <span className={styles.info}>
        <span className={styles.name}>{employee.name}</span>
        {employee.position && <span className={styles.role}>{employee.position}</span>}
        <span className={styles.dept}>{employee.team}</span>
      </span>
    </button>
  )
}
