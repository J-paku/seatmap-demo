import { useMemo } from 'react'
import { PixelAvatar } from './PixelAvatar'
import { PersonRow } from '@/components/PersonRow'
import { useEmployees, useFacilities, useSchedules, useTeams } from '@/hooks/use-mock-data'
import { useEmployeeMap } from '@/hooks/use-employee-map'
import { CATEGORY_LABEL, isScheduleMasked, scheduleTimeLabel } from '@/utils/format'
import { facilityNameByFacilityId, visibleFacilityName } from '@/utils/facility-name'
import { useDetailPanel } from '@/contexts/detail-panel-context'
import { useEmployeeAvatar } from '@/hooks/use-employee-avatar'
import type { Employee } from '@/types'
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
  const empById = useEmployeeMap(employees ?? [])
  if (!ev) return null

  // 非公開予定は件名だけでなく押さえた会議室も出さない(部屋から会議を辿れてしまう)
  const isMasked = isScheduleMasked(ev)
  const facilityName = visibleFacilityName(ev, ev.facilityId ? facilityNameById.get(ev.facilityId) : undefined)

  // 会議かつ非公開でなく参加者データがある予定だけ、登録者・参加者ブロックを出す
  // (外出・休暇・非公開・参加者データ無しは従来通り所有者1人行 employeeRow を出す)
  const participantIds = ev.participantIds ?? []
  // employees が未ロード(SWRデータ未着)の間は登録者・参加者ブロックを出さない。schedules が
  // employees より先に resolve するレースで、登録者ラベルだけ出て行が0件になるのを防ぐ
  const showAttendees = employees != null && ev.category === 'meeting' && !isMasked && participantIds.length > 0
  const organizer = showAttendees && ev.organizerId ? empById.get(ev.organizerId) : undefined
  const participants = showAttendees
    ? participantIds.map((id) => empById.get(id)).filter((person): person is Employee => person != null)
    : []

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
      {showAttendees ? (
        <>
          {organizer && (
            <div className={styles.detailGroup}>
              <div className={styles.detailGroupLabel}>登録者</div>
              <PersonRow employee={organizer} onClick={switchToEmployee} />
            </div>
          )}
          <div className={styles.detailGroup}>
            <div className={styles.detailPartsHeader}>
              <span className={styles.detailPartsLabel}>参加者</span>
              <span className={styles.detailPartsCount}>{participantIds.length}名</span>
            </div>
            <div className={styles.detailPartsList}>
              {/* 参加者一覧は登録者を除外しない(FacilityCurrentEvent/AttendeePopoverは除外するが、
                  この予定詳細では登録者も参加者の一人として両方のブロックに出す仕様のため揃えない) */}
              {participants.map((person) => (
                <PersonRow key={person.id} employee={person} onClick={switchToEmployee} />
              ))}
            </div>
          </div>
        </>
      ) : (
        employee && (
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
        )
      )}
    </div>
  )
}
