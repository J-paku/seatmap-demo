import { useEffect, useMemo } from 'react'
import { FacilityPanelHeader } from './components/FacilityPanelHeader'
import { FacilityScheduleSection } from './components/FacilityScheduleSection'
import { useEmployees, useFacilities, useFacilityMeetings } from '@/lib/mock-loader'
import { deriveFacilityState, minToHHMM } from '@/utils/facility-status'
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

  const empById = useMemo(() => new Map((employees ?? []).map((e) => [e.id, e])), [employees])
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
  const nameOf = (id: string) => empById.get(id)?.name ?? id

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
        <div className='fac-current'>
          <div className='fac-current-title'>{state.current.title}</div>
          <div className='fac-current-time'>
            {minToHHMM(state.current.startMin)}–{minToHHMM(state.current.endMin)} · 残り{state.current.endMin - nowMin}分
          </div>
          <div className='fac-current-org'>主催: {nameOf(state.current.organizerId)}</div>
          <div className='fac-parts-label'>参加者 {state.current.participantIds.length}名</div>
          <ul className='fac-parts'>
            {state.current.participantIds.map((id) => (
              <li key={id}>{nameOf(id)}</li>
            ))}
          </ul>
        </div>
      )}

      <FacilityScheduleSection
        facilityId={facility.facilityId}
        dateKey={jstDateKey(debouncedDate)}
        meetings={scheduleMeetings}
        isLoading={isScheduleLoading}
        isTodaySelected={isTodaySelected}
        onSwipePrevDay={goToPrevDay}
        onSwipeNextDay={goToNextDay}
      />
    </div>
  )
}
