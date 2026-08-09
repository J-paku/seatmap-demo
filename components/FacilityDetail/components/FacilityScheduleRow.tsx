import { minToHHMM } from '@/utils/facility-status'
import type { FacilityMeeting } from '@/types'
import type { AttendeeHandlers } from '../type'
import styles from '../facility-detail.module.css'

type Props = {
  meeting: FacilityMeeting
  organizerName: string
  isNow: boolean
  isDone: boolean
  isNext: boolean
  attendee: AttendeeHandlers
}

// 予約一覧の1行。進行中/終了済み/次の判定は本日を表示している時だけ親から渡る
// 参加者ボタンの data-attendee-popover は STEP6 の外側クリック判定が依存するため必須
export const FacilityScheduleRow = ({ meeting, organizerName, isNow, isDone, isNext, attendee }: Props) => {
  const attendeeCount = meeting.participantIds.length

  return (
    <li className={`${styles.facRow}${isNow ? ` ${styles.isNow}` : ''}${isDone ? ` ${styles.isDone}` : ''}`}>
      <div className={styles.facRowMain}>
        <span className={styles.facRowTime}>
          {minToHHMM(meeting.startMin)}-{minToHHMM(meeting.endMin)}
        </span>
        <span className={styles.facRowTitle}>{meeting.title || '予定あり'}</span>
        <span className={styles.facRowOrganizer}>
          <span className={styles.facRowOrganizerBadge}>登録者</span>
          <span className={styles.facRowOrganizerName}>{organizerName}</span>
        </span>
      </div>

      <div className={styles.facRowSide}>
        {isNext && <span className={styles.facRowNextBadge}>次</span>}
        <button
          type='button'
          className={styles.facAttendeeBtn}
          data-attendee-popover=''
          aria-label={`参加者 ${attendeeCount}名を表示`}
          onMouseEnter={(e) => attendee.onEnter(meeting.id, e.currentTarget)}
          onMouseLeave={attendee.onLeave}
          onClick={(e) => attendee.onToggle(meeting.id, e.currentTarget)}
        >
          <span className={`icon-msr-filled ${styles.facAttendeeIcon}`} aria-hidden='true'>
            people
          </span>
          {attendeeCount}
        </button>
      </div>
    </li>
  )
}
