import { useMemo } from 'react'
import { PixelAvatar } from './PixelAvatar'
import { useEmployees, useFacilities, useSchedules, useTeams } from '@/hooks/use-mock-data'
import { CATEGORY_LABEL, isScheduleMasked, scheduleTimeLabel } from '@/utils/format'
import { facilityNameByFacilityId, visibleFacilityName } from '@/utils/facility-name'
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
  const { data: facilities } = useFacilities()
  const { switchToEmployee } = useDetailPanel()

  const ev = schedules?.find((s) => s.id === eventId)
  const employee = ev ? employees?.find((e) => e.id === ev.employeeId) : null
  const team = employee ? teams?.find((t) => t.id === employee.teamId) : null
  const avatarConfig = useEmployeeAvatar(employee)
  const facilityNameById = useMemo(() => facilityNameByFacilityId(facilities ?? []), [facilities])
  if (!ev) return null

  // 非公開予定は件名だけでなく押さえた会議室も出さない(部屋から会議を辿れてしまう)
  const isMasked = isScheduleMasked(ev)
  const facilityName = visibleFacilityName(ev, ev.facilityId ? facilityNameById.get(ev.facilityId) : undefined)

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
      {facilityName && (
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>施設</span>
          <span className={styles.detailValue}>{facilityName}</span>
        </div>
      )}
      {isMasked && (
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>公開</span>
          <span className={styles.detailValue}>非公開</span>
        </div>
      )}
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
