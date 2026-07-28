import { useMemo } from 'react'
import { PixelAvatar } from './PixelAvatar'
import { StatusChip } from './StatusChip'
import { DateNavigator } from './DateNavigator'
import { SwipeDateStage } from './SwipeDateStage'
import { useEmployees, useSchedules, useSeats, useTeams } from '@/lib/mock-loader'
import { computePresenceMap } from '@/lib/presence'
import { useQuantizedClock } from '@/lib/use-quantized-clock'
import { CATEGORY_LABEL, scheduleTimeLabel } from '@/lib/format'
import { useDetailPanel } from '@/lib/detail-panel-context'
import { jstDateKey, jstKeyFromIso, useSelectedDate } from '@/lib/selected-date-context'
import { SELF_EMPLOYEE_ID, useSelfAvatar } from '@/lib/self-avatar-context'

// 社員詳細(座席詳細兼用)。空席時は空席表記
export const EmployeeDetail = ({ seatId }: { seatId: string }) => {
  const { data: seats } = useSeats()
  const { data: employees } = useEmployees()
  const { data: teams } = useTeams()
  const { data: schedules } = useSchedules()
  const { debouncedDate, isTodaySelected, goToPrevDay, goToNextDay } = useSelectedDate()
  const nowMs = useQuantizedClock(isTodaySelected)
  const { openScheduleDetail } = useDetailPanel()
  const { resolveAvatar, openEditor } = useSelfAvatar()

  const seat = seats?.find((s) => s.id === seatId)
  const employee = seat?.employeeId ? employees?.find((e) => e.id === seat.employeeId) : null
  const team = employee ? teams?.find((t) => t.id === employee.teamId) : null
  const isSelf = employee?.id === SELF_EMPLOYEE_ID

  // debouncedDate 当日分の予定に絞って時刻順に並べる
  const mySchedules = useMemo(() => {
    const key = jstDateKey(debouncedDate)
    return (schedules ?? [])
      .filter((s) => employee && s.employeeId === employee.id && jstKeyFromIso(s.start) === key)
      .sort((a, b) => a.start.localeCompare(b.start))
  }, [schedules, employee, debouncedDate])

  const status = useMemo(() => {
    if (!employee) return 'present' as const
    return computePresenceMap(mySchedules, nowMs, isTodaySelected).get(employee.id) ?? 'present'
  }, [mySchedules, nowMs, isTodaySelected, employee])

  if (!seat) return null

  return (
    <div className='employee-detail'>
      <DateNavigator />
      {!employee ? (
        <p className='detail-empty'>この座席は現在空席です</p>
      ) : (
        <>
          <div className='profile-card'>
            <div className='profile-avatar'>
              <PixelAvatar config={resolveAvatar(employee.id, employee.avatar)} size={64} />
            </div>
            <div className='profile-info'>
              <div className='profile-name-row'>
                <span className='profile-name'>{employee.name}</span>
                <StatusChip status={status} />
              </div>
              <span className='profile-kana'>{employee.nameKana}</span>
              {employee.position && <span className='profile-position'>{employee.position}</span>}
              {team && <span className='profile-team'>{team.name}</span>}
              {employee.email && <span className='profile-email'>{employee.email}</span>}
              {isSelf && (
                <button type='button' className='profile-edit-avatar' onClick={() => openEditor()}>
                  アバターを編集
                </button>
              )}
            </div>
          </div>

          <section className='schedule-section'>
            <h3 className='section-title'>{isTodaySelected ? '本日の予定' : '予定'}</h3>
            <SwipeDateStage cardKey={jstDateKey(debouncedDate)} onSwipePrevDay={goToPrevDay} onSwipeNextDay={goToNextDay}>
              {mySchedules.length === 0 ? (
                <p className='detail-empty'>{isTodaySelected ? '本日の予定はありません' : '予定はありません'}</p>
              ) : (
                <ul className='schedule-list'>
                  {mySchedules.map((ev) => (
                    <li key={ev.id}>
                      <button type='button' className='schedule-row' onClick={() => openScheduleDetail(ev.id)}>
                        <span className='schedule-time'>{scheduleTimeLabel(ev)}</span>
                        <span className='schedule-title'>{ev.title}</span>
                        <span className={`category-chip cat-${ev.category}`}>{CATEGORY_LABEL[ev.category]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </SwipeDateStage>
          </section>
        </>
      )}
    </div>
  )
}
