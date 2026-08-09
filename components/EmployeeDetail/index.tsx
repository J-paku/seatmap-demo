import { useEffect, useMemo } from 'react'
import { ProfileCard } from './components/ProfileCard'
import { ScheduleSection } from './components/ScheduleSection'
import { useEmployeeDetailTarget } from './hooks/use-employee-detail-target'
import { useScheduleRefresh } from '@/hooks/use-schedule-refresh'
import type { EmployeeDetailProps } from './type'
import { useFacilities, useSchedules } from '@/hooks/use-mock-data'
import { computePresenceMap } from '@/utils/presence'
import { facilityNameByFacilityId } from '@/utils/facility-name'
import { useQuantizedClock } from '@/hooks/use-quantized-clock'
import { useDetailPanel } from '@/contexts/detail-panel-context'
import { useSelectedDate } from '@/contexts/selected-date-context'
import { isSameJstDate, jstDateKey, jstKeyFromIso } from '@/utils/jst-date'
import { useEmployeeAvatar } from '@/hooks/use-employee-avatar'
import styles from './employee-detail.module.css'
import sdStyles from '@/components/schedule-detail.module.css'

// 12-member-detail: 社員詳細(座席詳細兼用)。空席時は空席表記のみ

type Props = EmployeeDetailProps

export const EmployeeDetail = ({ seatId, employeeId, onGoToSeat, showSeatUnsetNotice }: Props) => {
  const { data: schedules, error: scheduleError } = useSchedules()
  const { data: facilities } = useFacilities()
  const { date, debouncedDate, isTodaySelected, goToPrevDay, goToNextDay, goToToday } = useSelectedDate()
  const nowMs = useQuantizedClock(isTodaySelected)
  const { openScheduleDetail } = useDetailPanel()
  const { isRefreshing, cooldown, lastUpdatedLabel, refresh } = useScheduleRefresh()

  const { employee, team, isVacantSeat, isMissingSeat } = useEmployeeDetailTarget({ seatId, employeeId })
  const avatarConfig = useEmployeeAvatar(employee)

  // debouncedDate 当日分の予定に絞って時刻順に並べる
  const mySchedules = useMemo(() => {
    const key = jstDateKey(debouncedDate)
    return (schedules ?? [])
      .filter((s) => employee && s.employeeId === employee.id && jstKeyFromIso(s.start) === key)
      .sort((a, b) => a.start.localeCompare(b.start))
  }, [schedules, employee, debouncedDate])

  // 予定が押さえた会議室の名前を引くための対応表(フロアを跨いで引ける)
  const facilityNames = useMemo(() => facilityNameByFacilityId(facilities ?? []), [facilities])

  // 未定義のままにする(イベントなし=優先度4のフォールバックへ回す。'present' で埋めない)
  const status = useMemo(() => {
    if (!employee) return undefined
    return computePresenceMap(mySchedules, nowMs, isTodaySelected).get(employee.id)
  }, [mySchedules, nowMs, isTodaySelected, employee])

  // 表示日と確定取得日がずれている間はローディング扱い(ちらつき防止)
  const isScheduleLoading = isRefreshing || !isSameJstDate(date, debouncedDate)

  // パネルを閉じる(=アンマウント)と選択日を今日へリセット(パネル内限定の状態)
  useEffect(() => () => goToToday(), [goToToday])

  if (isMissingSeat) return null

  return (
    <div className={styles.employeeDetail}>
      {!employee ? (
        isVacantSeat && <p className={sdStyles.seatVacantNotice}>この座席は現在空席です</p>
      ) : (
        <>
          <ProfileCard
            employee={employee}
            team={team}
            avatar={avatarConfig}
            status={status}
            // 在席状態は予定から導出するため座席の有無とは無関係
            isBadgeVisible={isTodaySelected}
            isScheduleLoading={isScheduleLoading}
            onGoToSeat={onGoToSeat}
            showSeatUnsetNotice={showSeatUnsetNotice}
          />

          <ScheduleSection
            dateKey={jstDateKey(debouncedDate)}
            events={mySchedules}
            facilityNames={facilityNames}
            lastUpdatedLabel={lastUpdatedLabel}
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
