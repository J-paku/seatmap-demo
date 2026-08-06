import { useDetailPanel } from '@/contexts/detail-panel-context'
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
  const { openPersonDetail } = useDetailPanel()

  const empById = new Map(employees.map((employee) => [employee.id, employee]))
  const organizer = empById.get(meeting.organizerId)
  const participants = meeting.participantIds
    .map((id) => empById.get(id))
    .filter((employee): employee is Employee => employee != null)

  if (!organizer && participants.length === 0) return null

  // 席の有無に関わらずカードを開けるため、押せる/押せないを分けない
  const renderPerson = (employee: Employee) => (
    <button
      key={employee.id}
      type='button'
      className='fac-attendee-person fac-attendee-person-clickable'
      onClick={() => {
        onClose()
        openPersonDetail(employee.id)
      }}
    >
      <span className='fac-attendee-name'>{employee.name}</span>
      {employee.position && <span className='fac-attendee-role'>{employee.position}</span>}
      <span className='fac-attendee-dept'>{employee.team}</span>
    </button>
  )

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
