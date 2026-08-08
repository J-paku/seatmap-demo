import { FacilityScheduleRow } from './FacilityScheduleRow'
import type { Employee, FacilityMeeting } from '@/types'
import type { AttendeeHandlers } from '../type'
import styles from '../facility-detail.module.css'

type Props = {
  meetings: FacilityMeeting[]
  employees: Employee[]
  nowMin: number
  isTodaySelected: boolean
  attendee: AttendeeHandlers
}

// 選択日の予約一覧。進行中/終了済み/次は現在時刻に対する概念なので本日のみ付ける
export const FacilityScheduleCard = ({ meetings, employees, nowMin, isTodaySelected, attendee }: Props) => {
  const nameById = new Map(employees.map((employee) => [employee.id, employee.name]))
  const sorted = [...meetings].sort((a, b) => a.startMin - b.startMin)
  // 次の予約 = まだ始まっていない最初の1件。本日以外は該当なし
  const nextId = isTodaySelected ? sorted.find((m) => m.startMin > nowMin)?.id : undefined

  return (
    <ul className={styles.facRows}>
      {sorted.map((meeting) => (
        <FacilityScheduleRow
          key={meeting.id}
          meeting={meeting}
          organizerName={nameById.get(meeting.organizerId) ?? meeting.organizerId}
          isNow={isTodaySelected && meeting.startMin <= nowMin && nowMin < meeting.endMin}
          isDone={isTodaySelected && nowMin >= meeting.endMin}
          isNext={meeting.id === nextId}
          attendee={attendee}
        />
      ))}
    </ul>
  )
}
