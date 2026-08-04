import { DateNavigator } from '@/components/DateNavigator'
import { SwipeDateStage } from '@/components/SwipeDateStage'
import { minToHHMM } from '@/utils/facility-status'
import type { FacilityMeeting } from '@/types'

// 施設詳細の予定欄: 日付ナビ + 左右スワイプ台。社員詳細のScheduleSectionと同じ組み方
// 行の内部構成(登録者バッジ・進行中強調など)はSTEP5範囲のため、時刻/件名/N名の現行表示のみ持つ
// 施設未連携(facilityId無し)の時は日付ナビごと出さず「施設未連携」のみを表示する

type Props = {
  facilityId: string | undefined
  dateKey: string
  meetings: FacilityMeeting[]
  isLoading: boolean
  isTodaySelected: boolean
  onSwipePrevDay: () => void
  onSwipeNextDay: () => void
}

export const FacilityScheduleSection = ({
  facilityId,
  dateKey,
  meetings,
  isLoading,
  isTodaySelected,
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
            <ul className='fac-list'>
              {meetings.map((m) => (
                <li key={m.id}>
                  <span className='fac-list-time'>
                    {minToHHMM(m.startMin)}–{minToHHMM(m.endMin)}
                  </span>
                  <span className='fac-list-title'>{m.title}</span>
                  <span className='fac-list-parts'>{m.participantIds.length}名</span>
                </li>
              ))}
            </ul>
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
