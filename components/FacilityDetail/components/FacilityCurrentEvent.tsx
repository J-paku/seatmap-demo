import { FacilityPersonRow } from './FacilityPersonRow'
import { useEmployeeMap } from '@/hooks/use-employee-map'
import { minToHHMM } from '@/utils/facility-status'
import type { Employee, FacilityMeeting } from '@/types'
import styles from '../facility-detail.module.css'

type Props = {
  meeting: FacilityMeeting
  nowMin: number
  employees: Employee[]
}

// 現在進行中の会議: 件名・時刻・残り分数と、登録者/参加者をアバター付き人物行で表示する
export const FacilityCurrentEvent = ({ meeting, nowMin, employees }: Props) => {
  const empById = useEmployeeMap(employees)
  const organizer = empById.get(meeting.organizerId)
  // participantIds は登録者を含む出席者全員。参加者欄は登録者を除いた人だけを出す
  const participants = meeting.participantIds
    .filter((id) => id !== meeting.organizerId)
    .map((id) => empById.get(id))
    .filter((employee): employee is Employee => employee != null)

  return (
    <div className={styles.facCurrent}>
      <div className={styles.facCurrentSummary}>
        <div className={styles.facCurrentTitle}>{meeting.title || '予定あり'}</div>
        <div className={styles.facCurrentTime}>
          <span>
            {minToHHMM(meeting.startMin)} - {minToHHMM(meeting.endMin)}
          </span>
          <span className={styles.facCurrentRemain}>残り{meeting.endMin - nowMin}分</span>
        </div>
      </div>

      <div className={styles.facCurrentGroup}>
        <div className={styles.facCurrentGroupLabel}>登録者</div>
        {organizer && <FacilityPersonRow employee={organizer} />}
      </div>

      <div className={styles.facCurrentHairline} />

      <div className={styles.facCurrentGroup}>
        <div className={styles.facCurrentPartsHeader}>
          <span className={styles.facCurrentPartsLabel}>参加者</span>
          <span className={styles.facCurrentPartsCount}>
            <span className={`icon-msr-filled ${styles.facCurrentPartsIcon}`} aria-hidden='true'>
              people
            </span>
            {participants.length}名
          </span>
        </div>
        <div className={styles.facCurrentPartsList}>
          {participants.map((employee) => (
            <FacilityPersonRow key={employee.id} employee={employee} />
          ))}
        </div>
      </div>
    </div>
  )
}
