import { useEffect, useMemo } from 'react'
import { ProfileCard } from './components/ProfileCard'
import { ScheduleSection } from './components/ScheduleSection'
import { useScheduleRefresh } from '@/hooks/use-schedule-refresh'
import type { EmployeeDetailProps } from './type'
import { useEmployees, useSchedules, useSeats, useTeams } from '@/lib/mock-loader'
import { computePresenceMap } from '@/utils/presence'
import { useQuantizedClock } from '@/hooks/use-quantized-clock'
import { useDetailPanel } from '@/contexts/detail-panel-context'
import { useSelectedDate } from '@/contexts/selected-date-context'
import { isSameJstDate, jstDateKey, jstKeyFromIso } from '@/utils/jst-date'
import { useEmployeeAvatar } from '@/hooks/use-employee-avatar'

// 12-member-detail: 社員詳細(座席詳細兼用)。空席時は空席表記のみ

type Props = EmployeeDetailProps

export const EmployeeDetail = ({ seatId }: Props) => {
  const { data: seats } = useSeats()
  const { data: employees } = useEmployees()
  const { data: teams } = useTeams()
  const { data: schedules, error: scheduleError } = useSchedules()
  const { date, debouncedDate, isTodaySelected, goToPrevDay, goToNextDay, goToToday } = useSelectedDate()
  const nowMs = useQuantizedClock(isTodaySelected)
  const { openScheduleDetail } = useDetailPanel()
  const { isRefreshing, cooldown, refresh } = useScheduleRefresh()

  const seat = seats?.find((s) => s.id === seatId)
  const employee = seat?.employeeId ? employees?.find((e) => e.id === seat.employeeId) : null
  const avatarConfig = useEmployeeAvatar(employee)
  const team = employee ? teams?.find((t) => t.id === employee.teamId) ?? null : null

  // debouncedDate 当日分の予定に絞って時刻順に並べる
  const mySchedules = useMemo(() => {
    const key = jstDateKey(debouncedDate)
    return (schedules ?? [])
      .filter((s) => employee && s.employeeId === employee.id && jstKeyFromIso(s.start) === key)
      .sort((a, b) => a.start.localeCompare(b.start))
  }, [schedules, employee, debouncedDate])

  // 未定義のままにする(イベントなし=優先度4のフォールバックへ回す。'present' で埋めない)
  const status = useMemo(() => {
    if (!employee) return undefined
    return computePresenceMap(mySchedules, nowMs, isTodaySelected).get(employee.id)
  }, [mySchedules, nowMs, isTodaySelected, employee])

  // 表示日と確定取得日がずれている間はローディング扱い(ちらつき防止)
  const isScheduleLoading = isRefreshing || !isSameJstDate(date, debouncedDate)

  // パネルを閉じる(=アンマウント)と選択日を今日へリセット(パネル内限定の状態)
  useEffect(() => () => goToToday(), [goToToday])

  if (!seat) return null

  return (
    <div className='employee-detail'>
      {!employee ? (
        <p className='seat-vacant-notice'>この座席は現在空席です</p>
      ) : (
        <>
          <ProfileCard
            employee={employee}
            team={team}
            avatar={avatarConfig}
            status={status}
            isBadgeVisible={!!seat.id && isTodaySelected}
            isScheduleLoading={isScheduleLoading}
          />

          {/* 座席へ移動ボタン/座席未設定文言はこのデモの侵入経路(座席カード・キャンバス)では発生しないため
              アクションバー自体を描画しない(スペック: 該当なしなら非表示) */}

          <ScheduleSection
            dateKey={jstDateKey(debouncedDate)}
            events={mySchedules}
            hasError={!!scheduleError}
            isLoading={isScheduleLoading}
            isTodaySelected={isTodaySelected}
            isRefreshDisabled={isRefreshing || cooldown > 0}
            cooldown={cooldown}
            onRefresh={refresh}
            onOpenEvent={openScheduleDetail}
            onSwipePrevDay={goToPrevDay}
            onSwipeNextDay={goToNextDay}
          />
        </>
      )}
    </div>
  )
}
