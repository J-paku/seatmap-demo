import { ScheduleCard } from './ScheduleCard'
import { DateNavigator } from '@/components/DateNavigator'
import { SwipeDateStage } from '@/components/SwipeDateStage'
import type { ScheduleEvent } from '@/types'
import styles from '../schedule-section.module.css'

// 見出し + 日付ナビ + 左右スワイプ台。日付操作と予定表示の組み立てだけを持つ

type Props = {
  dateKey: string
  events: ScheduleEvent[]
  facilityNames: Map<string, string>
  lastUpdatedLabel: string | null
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
  facilityNames,
  lastUpdatedLabel,
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
  <section className={styles.scheduleSection}>
    <div className={styles.scheduleSectionLabel}>
      <span className={`material-symbols-outlined ${styles.scheduleSectionIcon}`}>calendar_today</span>
      <span className={styles.scheduleSectionTitle}>スケジュール</span>
      <span className={styles.scheduleSectionHairline} />
    </div>

    <DateNavigator />

    <div className={styles.scheduleSwipeWrap}>
      <SwipeDateStage cardKey={dateKey} onSwipePrevDay={onSwipePrevDay} onSwipeNextDay={onSwipeNextDay} fill>
        <ScheduleCard
          events={events}
          facilityNames={facilityNames}
          lastUpdatedLabel={lastUpdatedLabel}
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
