import { useDetailPanel } from '@/contexts/detail-panel-context'
import { useEmployeeMap } from '@/hooks/use-employee-map'
import type { Employee, FacilityMeeting } from '@/types'
import type { AttendeePopoverState } from '../type'
import styles from '../facility-detail.module.css'

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

  const empById = useEmployeeMap(employees)
  const organizer = empById.get(meeting.organizerId)
  // participantIds は登録者を含む出席者全員。参加者欄は登録者を除いた人だけを出す
  // (両方に同じ人が出ると、どちらが登録者かを行から読み取れなくなる)
  const participants = meeting.participantIds
    .filter((id) => id !== meeting.organizerId)
    .map((id) => empById.get(id))
    .filter((employee): employee is Employee => employee != null)

  if (!organizer && participants.length === 0) return null

  // 席の有無に関わらずカードを開けるため、押せる/押せないを分けない
  const renderPerson = (employee: Employee) => (
    <button
      key={employee.id}
      type='button'
      className={`${styles.facAttendeePerson} ${styles.facAttendeePersonClickable}`}
      onClick={() => {
        onClose()
        openPersonDetail(employee.id)
      }}
    >
      <span className={styles.facAttendeeName}>{employee.name}</span>
      {employee.position && <span className={styles.facAttendeeRole}>{employee.position}</span>}
      <span className={styles.facAttendeeDept}>{employee.team}</span>
    </button>
  )

  return (
    <div
      className={`${styles.facAttendeePop}${state.flipped ? ` ${styles.isFlipped}` : ''}`}
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
        <div className={styles.facAttendeeGroup}>
          <div className={styles.facAttendeeHeading}>登録者</div>
          {renderPerson(organizer)}
        </div>
      )}
      {participants.length > 0 && (
        <div className={styles.facAttendeeGroup}>
          <div className={styles.facAttendeeHeading}>参加者</div>
          <div className={styles.facAttendeeList}>{participants.map(renderPerson)}</div>
        </div>
      )}
    </div>
  )
}
