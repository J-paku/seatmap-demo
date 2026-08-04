import { FacilityPersonRow } from './FacilityPersonRow'
import { minToHHMM } from '@/utils/facility-status'
import type { Employee, FacilityMeeting } from '@/types'

type Props = {
  meeting: FacilityMeeting
  nowMin: number
  employees: Employee[]
}

// 現在進行中の会議: 件名・時刻・残り分数と、登録者/参加者をアバター付き人物行で表示する
export const FacilityCurrentEvent = ({ meeting, nowMin, employees }: Props) => {
  const empById = new Map(employees.map((employee) => [employee.id, employee]))
  const organizer = empById.get(meeting.organizerId)
  const participants = meeting.participantIds
    .map((id) => empById.get(id))
    .filter((employee): employee is Employee => employee != null)

  return (
    <div className='fac-current'>
      <div className='fac-current-summary'>
        <div className='fac-current-title'>{meeting.title || '予定あり'}</div>
        <div className='fac-current-time'>
          <span>
            {minToHHMM(meeting.startMin)} - {minToHHMM(meeting.endMin)}
          </span>
          <span className='fac-current-remain'>残り{meeting.endMin - nowMin}分</span>
        </div>
      </div>

      <div className='fac-current-group'>
        <div className='fac-current-group-label'>登録者</div>
        {organizer && <FacilityPersonRow employee={organizer} />}
      </div>

      <div className='fac-current-hairline' />

      <div className='fac-current-group'>
        <div className='fac-current-parts-header'>
          <span className='fac-current-parts-label'>参加者</span>
          <span className='fac-current-parts-count'>
            <span className='icon-msr-filled fac-current-parts-icon' aria-hidden='true'>
              people
            </span>
            {participants.length}名
          </span>
        </div>
        <div className='fac-current-parts-list'>
          {participants.map((employee) => (
            <FacilityPersonRow key={employee.id} employee={employee} />
          ))}
        </div>
      </div>
    </div>
  )
}
