import { ScheduleCard } from './ScheduleCard'
import { DateNavigator } from '@/components/DateNavigator'
import { SwipeDateStage } from '@/components/SwipeDateStage'
import type { ScheduleEvent } from '@/types'

// 見出し + 日付ナビ + 左右スワイプ台。日付操作と予定表示の組み立てだけを持つ

type Props = {
  dateKey: string
  events: ScheduleEvent[]
  hasError: boolean
  isLoading: boolean
  isTodaySelected: boolean
  isRefreshDisabled: boolean
  cooldown: number
  onRefresh: () => void
  onOpenEvent: (eventId: string) => void
  onSwipePrevDay: () => void
  onSwipeNextDay: () => void
}

export const ScheduleSection = ({
  dateKey,
  events,
  hasError,
  isLoading,
  isTodaySelected,
  isRefreshDisabled,
  cooldown,
  onRefresh,
  onOpenEvent,
  onSwipePrevDay,
  onSwipeNextDay,
}: Props) => (
  <section className='schedule-section'>
    <div className='schedule-section-label'>
      <span className='material-symbols-outlined schedule-section-icon'>calendar_today</span>
      <span className='schedule-section-title'>スケジュール</span>
      <span className='schedule-section-hairline' />
    </div>

    <DateNavigator />

    <div className='schedule-swipe-wrap'>
      <SwipeDateStage cardKey={dateKey} onSwipePrevDay={onSwipePrevDay} onSwipeNextDay={onSwipeNextDay}>
        <ScheduleCard
          events={events}
          hasError={hasError}
          isLoading={isLoading}
          isTodaySelected={isTodaySelected}
          isRefreshDisabled={isRefreshDisabled}
          cooldown={cooldown}
          onRefresh={onRefresh}
          onOpenEvent={onOpenEvent}
        />
      </SwipeDateStage>
    </div>
  </section>
)
