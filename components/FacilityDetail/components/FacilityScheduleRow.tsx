import { minToHHMM } from '@/utils/facility-status'
import type { FacilityMeeting } from '@/types'

type Props = {
  meeting: FacilityMeeting
  organizerName: string
  isNow: boolean
  isDone: boolean
  isNext: boolean
}

// 予約一覧の1行。進行中/終了済み/次の判定は本日を表示している時だけ親から渡る
// 参加者ボタンの data-attendee-popover は STEP6 の外側クリック判定が依存するため必須
export const FacilityScheduleRow = ({ meeting, organizerName, isNow, isDone, isNext }: Props) => {
  const attendeeCount = meeting.participantIds.length

  return (
    <li className={`fac-row${isNow ? ' is-now' : ''}${isDone ? ' is-done' : ''}`}>
      <div className='fac-row-main'>
        <span className='fac-row-time'>
          {minToHHMM(meeting.startMin)}-{minToHHMM(meeting.endMin)}
        </span>
        <span className='fac-row-title'>{meeting.title || '予定あり'}</span>
        <span className='fac-row-organizer'>
          <span className='fac-row-organizer-badge'>登録者</span>
          <span className='fac-row-organizer-name'>{organizerName}</span>
        </span>
      </div>

      <div className='fac-row-side'>
        {isNext && <span className='fac-row-next-badge'>次</span>}
        <button
          type='button'
          className='fac-attendee-btn'
          data-attendee-popover=''
          aria-label={`参加者 ${attendeeCount}名を表示`}
        >
          <span className='icon-msr-filled fac-attendee-icon' aria-hidden='true'>
            people
          </span>
          {attendeeCount}
        </button>
      </div>
    </li>
  )
}
