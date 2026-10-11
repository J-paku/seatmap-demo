import { isScheduleMasked, scheduleTimeLabel, scheduleTitleLabel } from '@/utils/format'
import { visibleFacilityName } from '@/utils/facility-name'
import type { ScheduleEvent } from '@/types'
import styles from '../schedule-section.module.css'

// 予定1件の行。終日バンドと時刻付き一覧の両方から使う

type Props = {
  event: ScheduleEvent
  facilityName: string | undefined
  onOpenEvent: (eventId: string) => void
}

export const ScheduleRow = ({ event, facilityName, onOpenEvent }: Props) => {
  const isMasked = isScheduleMasked(event)
  const shownFacilityName = visibleFacilityName(event, facilityName)

  return (
    <li>
      <button type='button' className={styles.scheduleRow} onClick={() => onOpenEvent(event.id)}>
        <span className={`${styles.scheduleTime}${event.isAllDay ? ` ${styles.isAllday}` : ''}`}>
          {scheduleTimeLabel(event)}
        </span>
        {isMasked && (
          <>
            <span className={`material-symbols-outlined ${styles.scheduleLock}`} style={{ fontSize: 14 }} aria-hidden='true'>
              lock
            </span>
            <span className='sr-only'>非公開</span>
          </>
        )}
        <span className={`${styles.scheduleTitle}${isMasked ? ` ${styles.isMasked}` : ''}`}>{scheduleTitleLabel(event)}</span>
        {shownFacilityName && (
          <span className={styles.scheduleFacility}>
            <span className='material-symbols-outlined' style={{ fontSize: 14 }} aria-hidden='true'>
              meeting_room
            </span>
            <span className={styles.scheduleFacilityName}>{shownFacilityName}</span>
          </span>
        )}
      </button>
    </li>
  )
}
