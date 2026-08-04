import { useDetailPanel } from '@/contexts/detail-panel-context'
import { useSeats } from '@/lib/mock-loader'
import type { Employee, FacilityMeeting } from '@/types'
import type { AttendeePopoverState } from '../type'

type Props = {
  state: AttendeePopoverState
  meeting: FacilityMeeting
  employees: Employee[]
  onMouseEnter: () => void
  onMouseLeave: () => void
  onClose: () => void
}

// 参加者ポップオーバー。シートの overflow に切られないよう position:fixed で描く
// data-attendee-popover は外側クリック判定が参照するのでボタン側と揃えて必ず付ける
export const AttendeePopover = ({ state, meeting, employees, onMouseEnter, onMouseLeave, onClose }: Props) => {
  const { data: seats } = useSeats()
  const { openSeatDetail } = useDetailPanel()

  const empById = new Map(employees.map((employee) => [employee.id, employee]))
  const organizer = empById.get(meeting.organizerId)
  const participants = meeting.participantIds
    .map((id) => empById.get(id))
    .filter((employee): employee is Employee => employee != null)

  if (!organizer && participants.length === 0) return null

  const seatIdOf = (employeeId: string) => (seats ?? []).find((s) => s.employeeId === employeeId)?.id

  const renderPerson = (employee: Employee) => {
    const seatId = seatIdOf(employee.id)
    const content = (
      <>
        <span className='fac-attendee-name'>{employee.name}</span>
        {employee.position && <span className='fac-attendee-role'>{employee.position}</span>}
        <span className='fac-attendee-dept'>{employee.team}</span>
      </>
    )

    // 座席が無い社員は押せることを見せない
    if (!seatId) {
      return (
        <div key={employee.id} className='fac-attendee-person'>
          {content}
        </div>
      )
    }

    return (
      <button
        key={employee.id}
        type='button'
        className='fac-attendee-person fac-attendee-person-clickable'
        onClick={() => {
          onClose()
          openSeatDetail(seatId)
        }}
      >
        {content}
      </button>
    )
  }

  return (
    <div
      className={`fac-attendee-pop${state.flipped ? ' is-flipped' : ''}`}
      data-attendee-popover=''
      style={{
        top: state.top,
        right: state.right,
        maxHeight: state.availableHeight,
        maxWidth: state.maxWidthPx,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {organizer && (
        <div className='fac-attendee-group'>
          <div className='fac-attendee-heading'>登録者</div>
          {renderPerson(organizer)}
        </div>
      )}
      {participants.length > 0 && (
        <div className='fac-attendee-group'>
          <div className='fac-attendee-heading'>参加者</div>
          <div className='fac-attendee-list'>{participants.map(renderPerson)}</div>
        </div>
      )}
    </div>
  )
}
