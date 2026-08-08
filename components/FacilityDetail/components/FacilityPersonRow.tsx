import { PixelAvatar } from '@/components/PixelAvatar'
import { useEmployeeAvatar } from '@/hooks/use-employee-avatar'
import { useDetailPanel } from '@/contexts/detail-panel-context'
import type { Employee } from '@/types'
import styles from '../facility-detail.module.css'

type Props = {
  employee: Employee
}

// 現在の会議の人物行: 32×32 アバター枠 + 氏名/役職/部署
// 席の有無に関わらずカードを開けるため、押せる/押せないを分けない
export const FacilityPersonRow = ({ employee }: Props) => {
  const { openPersonDetail } = useDetailPanel()
  const avatarConfig = useEmployeeAvatar(employee)

  return (
    <button
      type='button'
      className={`${styles.facPersonRow} ${styles.facPersonRowClickable}`}
      onClick={() => openPersonDetail(employee.id)}
    >
      <span className={styles.facPersonAvatarFrame}>
        <PixelAvatar config={avatarConfig} size={28} />
      </span>
      <span className={styles.facPersonInfo}>
        <span className={styles.facPersonName}>{employee.name}</span>
        {employee.position && <span className={styles.facPersonRole}>{employee.position}</span>}
        <span className={styles.facPersonDept}>{employee.team}</span>
      </span>
    </button>
  )
}
