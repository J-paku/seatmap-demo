import { PixelAvatar } from './PixelAvatar'
import { useEmployees, useSchedules, useTeams } from '@/lib/mock-loader'
import { CATEGORY_LABEL, scheduleTimeLabel } from '@/utils/format'
import { useDetailPanel } from '@/contexts/detail-panel-context'
import { useEmployeeAvatar } from '@/hooks/use-employee-avatar'
import styles from './schedule-detail.module.css'

const CATEGORY_CLASS = {
  meeting: styles.catMeeting,
  out: styles.catOut,
  vacation: styles.catVacation,
} as const


// 予定詳細(社員詳細の上にスタック)
export const ScheduleDetail = ({ eventId }: { eventId: string }) => {
  const { data: schedules } = useSchedules()
  const { data: employees } = useEmployees()
  const { data: teams } = useTeams()
  const { switchToEmployee } = useDetailPanel()

  const ev = schedules?.find((s) => s.id === eventId)
  const employee = ev ? employees?.find((e) => e.id === ev.employeeId) : null
  const team = employee ? teams?.find((t) => t.id === employee.teamId) : null
  const avatarConfig = useEmployeeAvatar(employee)
  if (!ev) return null

  return (
    <div className='schedule-detail'>
      <div className={styles.detailRow}>
        <span className={styles.detailLabel}>時刻</span>
        <span className={styles.detailValue}>{scheduleTimeLabel(ev)}</span>
      </div>
      <div className={styles.detailRow}>
        <span className={styles.detailLabel}>区分</span>
        <span className={`${styles.categoryChip} ${CATEGORY_CLASS[ev.category]}`}>{CATEGORY_LABEL[ev.category]}</span>
      </div>
      {employee && (
        <button type='button' className={styles.employeeRow} onClick={() => switchToEmployee(employee.id)}>
          <span className={styles.employeeRowAvatar}>
            <PixelAvatar config={avatarConfig} size={40} />
          </span>
          <span className={styles.employeeRowInfo}>
            <span className={styles.employeeRowName}>{employee.name}</span>
            <span className={styles.employeeRowSub}>
              {employee.position ? `${employee.position}・` : ''}
              {team?.name ?? ''}
            </span>
          </span>
        </button>
      )}
    </div>
  )
}
