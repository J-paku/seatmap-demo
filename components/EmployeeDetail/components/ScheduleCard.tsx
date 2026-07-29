import { scheduleTimeLabel } from '@/utils/format'
import type { ScheduleEvent } from '@/types'

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
  <div className='schedule-card'>
    <button
      type='button'
      className='schedule-refresh-btn'
      aria-label='スケジュールを更新'
      disabled={isRefreshDisabled}
      onClick={onRefresh}
    >
      {cooldown > 0 ? (
        <>
          <span className='material-symbols-outlined' style={{ fontSize: 16 }}>
            refresh
          </span>
          <span className='schedule-refresh-cooldown'>{cooldown}s</span>
        </>
      ) : (
        <span className='material-symbols-outlined' style={{ fontSize: 20 }}>
          refresh
        </span>
      )}
    </button>

    {hasError ? (
      <div className='schedule-error'>
        <span className='material-symbols-outlined' style={{ fontSize: 20 }}>
          error
        </span>
        <span>取得に失敗しました</span>
      </div>
    ) : (
      <>
        {events.length > 0 && (
          <ul className='schedule-list'>
            {events.map((ev) => (
              <li key={ev.id}>
                <button type='button' className='schedule-row' onClick={() => onOpenEvent(ev.id)}>
                  <span className={`schedule-time${ev.isAllDay ? ' is-allday' : ''}`}>{scheduleTimeLabel(ev)}</span>
                  <span className='schedule-title'>{ev.title || '予定あり'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {events.length === 0 && !isLoading && (
          <p className='schedule-empty'>{isTodaySelected ? '今日の予定はありません' : '予定はありません'}</p>
        )}
        {isLoading && (
          <div className={`schedule-loading${events.length > 0 ? ' schedule-loading-overlay' : ' schedule-loading-center'}`}>
            <span className='schedule-spinner' />
            <span>読み取り中です</span>
          </div>
        )}
      </>
    )}
  </div>
)
