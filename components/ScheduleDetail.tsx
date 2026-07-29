import { PixelAvatar } from './PixelAvatar'
import { useEmployees, useSchedules, useTeams } from '@/lib/mock-loader'
import { CATEGORY_LABEL, scheduleTimeLabel } from '@/utils/format'
import { useDetailPanel } from '@/contexts/detail-panel-context'
import { useSelfAvatar } from '@/contexts/self-avatar-context'

// 予定詳細(社員詳細の上にスタック)
export const ScheduleDetail = ({ eventId }: { eventId: string }) => {
  const { data: schedules } = useSchedules()
  const { data: employees } = useEmployees()
  const { data: teams } = useTeams()
  const { switchToEmployee } = useDetailPanel()
  const { resolveAvatar } = useSelfAvatar()

  const ev = schedules?.find((s) => s.id === eventId)
  const employee = ev ? employees?.find((e) => e.id === ev.employeeId) : null
  const team = employee ? teams?.find((t) => t.id === employee.teamId) : null
  if (!ev) return null

  return (
    <div className='schedule-detail'>
      <div className='detail-row'>
        <span className='detail-label'>時刻</span>
        <span className='detail-value'>{scheduleTimeLabel(ev)}</span>
      </div>
      <div className='detail-row'>
        <span className='detail-label'>区分</span>
        <span className={`category-chip cat-${ev.category}`}>{CATEGORY_LABEL[ev.category]}</span>
      </div>
      {employee && (
        <button type='button' className='employee-row' onClick={() => switchToEmployee(employee.id)}>
          <span className='employee-row-avatar'>
            <PixelAvatar config={resolveAvatar(employee.id, employee.avatar)} size={40} />
          </span>
          <span className='employee-row-info'>
            <span className='employee-row-name'>{employee.name}</span>
            <span className='employee-row-sub'>
              {employee.position ? `${employee.position}・` : ''}
              {team?.name ?? ''}
            </span>
          </span>
        </button>
      )}
    </div>
  )
}
