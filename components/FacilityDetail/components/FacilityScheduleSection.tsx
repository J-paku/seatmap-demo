import { DateNavigator } from '@/components/DateNavigator'
import { SwipeDateStage } from '@/components/SwipeDateStage'
import { FacilityScheduleCard } from './FacilityScheduleCard'
import type { Employee, FacilityMeeting } from '@/types'
import type { AttendeeHandlers } from '../type'
import scheduleStyles from '@/components/EmployeeDetail/schedule-section.module.css'
import styles from '../facility-detail.module.css'

// 施設詳細の予定欄: 日付ナビ + 左右スワイプ台。社員詳細のScheduleSectionと同じ組み方
// 施設未連携(facilityId無し)の時は日付ナビごと出さず「施設未連携」のみを表示する

type Props = {
  facilityId: string | undefined
  dateKey: string
  meetings: FacilityMeeting[]
  employees: Employee[]
  nowMin: number
  isLoading: boolean
  isTodaySelected: boolean
  attendee: AttendeeHandlers
  onSwipePrevDay: () => void
  onSwipeNextDay: () => void
}

export const FacilityScheduleSection = ({
  facilityId,
  dateKey,
  meetings,
  employees,
  nowMin,
  isLoading,
  isTodaySelected,
  attendee,
  onSwipePrevDay,
  onSwipeNextDay,
}: Props) => {
  if (!facilityId) return <div className={styles.facEmpty}>施設未連携</div>

  return (
    <>
      <DateNavigator />
      <div className={styles.facSwipeWrap}>
        <SwipeDateStage cardKey={dateKey} onSwipePrevDay={onSwipePrevDay} onSwipeNextDay={onSwipeNextDay} fill>
          {meetings.length > 0 && (
            <FacilityScheduleCard
              meetings={meetings}
              employees={employees}
              nowMin={nowMin}
              isTodaySelected={isTodaySelected}
              attendee={attendee}
            />
          )}
          {meetings.length === 0 && !isLoading && (
            <p className={styles.facEmpty}>{isTodaySelected ? '本日の予約はありません' : '予約はありません'}</p>
          )}
          {isLoading && (
            <div
              className={`${scheduleStyles.scheduleLoading} ${meetings.length > 0 ? scheduleStyles.scheduleLoadingOverlay : scheduleStyles.scheduleLoadingCenter}`}
            >
              <span className={scheduleStyles.scheduleSpinner} />
              <span>読み取り中です</span>
            </div>
          )}
        </SwipeDateStage>
      </div>
    </>
  )
}
