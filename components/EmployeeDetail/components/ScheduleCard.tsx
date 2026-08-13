import { ScheduleRow } from './ScheduleRow'
import { GaroonSyncNote } from '@/components/GaroonSyncNote'
import type { ScheduleEvent } from '@/types'
import styles from '../schedule-section.module.css'

// 予定カードの中身。エラー・一覧・空・ローディングの出し分けだけを持つ
// 終日予定は時刻付きの予定と別バンドに分ける(時刻順に混ぜると1日中の予定が先頭を占める)

type Props = {
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
}

export const ScheduleCard = ({
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
}: Props) => {
  const allDayEvents: ScheduleEvent[] = []
  const timedEvents: ScheduleEvent[] = []
  for (const e of events) {
    if (e.isAllDay) allDayEvents.push(e)
    else timedEvents.push(e)
  }
  const facilityNameOf = (e: ScheduleEvent) => (e.facilityId ? facilityNames.get(e.facilityId) : undefined)

  return (
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
          {allDayEvents.length > 0 && (
            /* 区切り線は下に時刻付きの予定がある時だけ。終日だけの日に引くと線が宙に浮く */
            <ul className={`${styles.scheduleList}${timedEvents.length > 0 ? ` ${styles.scheduleAllDayList}` : ''}`}>
              {allDayEvents.map((ev) => (
                <ScheduleRow key={ev.id} event={ev} facilityName={facilityNameOf(ev)} onOpenEvent={onOpenEvent} />
              ))}
            </ul>
          )}
          {timedEvents.length > 0 && (
            <ul className={styles.scheduleList}>
              {timedEvents.map((ev) => (
                <ScheduleRow key={ev.id} event={ev} facilityName={facilityNameOf(ev)} onOpenEvent={onOpenEvent} />
              ))}
            </ul>
          )}
          {events.length === 0 && !isLoading && (
            <p className={styles.scheduleEmpty}>{isTodaySelected ? '今日の予定はありません' : '予定はありません'}</p>
          )}
          {lastUpdatedLabel && <p className={styles.scheduleUpdatedAt}>最終更新 {lastUpdatedLabel}</p>}
          <GaroonSyncNote className={styles.scheduleSyncNote} />
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
}
