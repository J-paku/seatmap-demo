import { scheduleTimeLabel } from '@/utils/format'
import type { ScheduleEvent } from '@/types'
import styles from '../schedule-section.module.css'

// 予定カードの中身。エラー・一覧・空・ローディングの出し分けだけを持つ

type Props = {
  events: ScheduleEvent[]
  hasError: boolean
  isLoading: boolean
  isTodaySelected: boolean
  isRefreshDisabled: boolean
  cooldown: number
  onRefresh: () => void
  onOpenEvent: (eventId: string) => void
}

export const ScheduleCard = ({
  events,
  hasError,
  isLoading,
  isTodaySelected,
  isRefreshDisabled,
  cooldown,
  onRefresh,
  onOpenEvent,
}: Props) => (
  <div className={styles.scheduleCard}>
    <button
      type='button'
      className={styles.scheduleRefreshBtn}
      aria-label='スケジュールを更新'
      disabled={isRefreshDisabled}
      onClick={onRefresh}
    >
      {cooldown > 0 ? (
        <>
          <span className='material-symbols-outlined' style={{ fontSize: 16 }}>
            refresh
          </span>
          <span className={styles.scheduleRefreshCooldown}>{cooldown}s</span>
        </>
      ) : (
        <span className='material-symbols-outlined' style={{ fontSize: 20 }}>
          refresh
        </span>
      )}
    </button>

    {hasError ? (
      <div className={styles.scheduleError}>
        <span className='material-symbols-outlined' style={{ fontSize: 20 }}>
          error
        </span>
        <span>取得に失敗しました</span>
      </div>
    ) : (
      <>
        {events.length > 0 && (
          <ul className={styles.scheduleList}>
            {events.map((ev) => (
              <li key={ev.id}>
                <button type='button' className={styles.scheduleRow} onClick={() => onOpenEvent(ev.id)}>
                  <span className={`${styles.scheduleTime}${ev.isAllDay ? ` ${styles.isAllday}` : ''}`}>{scheduleTimeLabel(ev)}</span>
                  <span className={styles.scheduleTitle}>{ev.title || '予定あり'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {events.length === 0 && !isLoading && (
          <p className={styles.scheduleEmpty}>{isTodaySelected ? '今日の予定はありません' : '予定はありません'}</p>
        )}
        {isLoading && (
          <div className={`${styles.scheduleLoading} ${events.length > 0 ? styles.scheduleLoadingOverlay : styles.scheduleLoadingCenter}`}>
            <span className={styles.scheduleSpinner} />
            <span>読み取り中です</span>
          </div>
        )}
      </>
    )}
  </div>
)
