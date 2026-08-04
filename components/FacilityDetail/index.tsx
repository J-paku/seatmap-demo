import { useEffect } from 'react'
import { FacilityCurrentEvent } from './components/FacilityCurrentEvent'
import { FacilityPanelHeader } from './components/FacilityPanelHeader'
import { FacilityScheduleSection } from './components/FacilityScheduleSection'
import { useEmployees, useFacilities, useFacilityMeetings } from '@/lib/mock-loader'
import { deriveFacilityState } from '@/utils/facility-status'
import type { FacilityState } from '@/utils/facility-status'
import { useSelectedDate } from '@/contexts/selected-date-context'
import { useFacilityScheduleForDate } from '@/hooks/use-facility-schedule-for-date'
import { useQuantizedClock } from '@/hooks/use-quantized-clock'
import { useDetailPanel } from '@/contexts/detail-panel-context'
import { isSameJstDate, jstDateKey } from '@/utils/jst-date'

// 施設詳細: ヘッダー(アイコン・施設名・更新・状態バッジ・閉じる) + 現在の会議 + 日付別の予定
export const FacilityDetail = ({ facilityId }: { facilityId: string }) => {
  const { data: facilities } = useFacilities()
  const { data: meetings } = useFacilityMeetings()
  const { data: employees } = useEmployees()
  const { date, debouncedDate, isTodaySelected, goToPrevDay, goToNextDay, goToToday } = useSelectedDate()
  const { closeTop } = useDetailPanel()
  const nowMs = useQuantizedClock(isTodaySelected)

  const facility = facilities?.find((f) => f.id === facilityId)

  const { meetings: scheduleMeetings, isLoading: isFetchLoading } = useFacilityScheduleForDate({
    facilityId: facility?.facilityId ?? '',
    dateKey: jstDateKey(debouncedDate),
    isTodaySelected,
  })
  // 表示日と確定取得日がずれている間はローディング扱い(社員詳細と同じくちらつき防止)
  const isScheduleLoading = isFetchLoading || !isSameJstDate(date, debouncedDate)

  // パネルを閉じる(=アンマウント)と選択日を今日へリセット(社員詳細と同じ)
  useEffect(() => () => goToToday(), [goToToday])

  if (!facility) return null

  const now = new Date(nowMs)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const state: FacilityState = deriveFacilityState(facility, meetings ?? [], nowMin)

  return (
    <div className='facility-detail'>
      <FacilityPanelHeader
        facilityName={facility.name}
        status={state.status}
        isTodaySelected={isTodaySelected}
        onClose={closeTop}
      />
      {facility.capacity != null && <span className='fac-cap'>定員{facility.capacity}名</span>}

      {isTodaySelected && state.current && (
        <FacilityCurrentEvent meeting={state.current} nowMin={nowMin} employees={employees ?? []} />
      )}

      <FacilityScheduleSection
        facilityId={facility.facilityId}
        dateKey={jstDateKey(debouncedDate)}
        meetings={scheduleMeetings}
        employees={employees ?? []}
        nowMin={nowMin}
        isLoading={isScheduleLoading}
        isTodaySelected={isTodaySelected}
        onSwipePrevDay={goToPrevDay}
        onSwipeNextDay={goToNextDay}
      />
    </div>
  )
}
