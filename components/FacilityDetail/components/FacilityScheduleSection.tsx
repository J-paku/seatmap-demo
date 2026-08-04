import { DateNavigator } from '@/components/DateNavigator'
import { SwipeDateStage } from '@/components/SwipeDateStage'
import { FacilityScheduleCard } from './FacilityScheduleCard'
import type { Employee, FacilityMeeting } from '@/types'
import type { AttendeeHandlers } from '../type'

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
  if (!facilityId) return <div className='fac-empty'>施設未連携</div>

  return (
    <>
      <DateNavigator />
      <div className='fac-swipe-wrap'>
        <SwipeDateStage cardKey={dateKey} onSwipePrevDay={onSwipePrevDay} onSwipeNextDay={onSwipeNextDay}>
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
            <p className='fac-empty'>{isTodaySelected ? '本日の予約はありません' : '予約はありません'}</p>
          )}
          {isLoading && (
            <div
              className={`schedule-loading${meetings.length > 0 ? ' schedule-loading-overlay' : ' schedule-loading-center'}`}
            >
              <span className='schedule-spinner' />
              <span>読み取り中です</span>
            </div>
          )}
        </SwipeDateStage>
      </div>
    </>
  )
}
