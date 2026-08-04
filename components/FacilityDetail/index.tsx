import { useEffect } from 'react'
import { AttendeePopover } from './components/AttendeePopover'
import { DeleteFacilityDialog } from './components/DeleteFacilityDialog'
import { FacilityCurrentEvent } from './components/FacilityCurrentEvent'
import { FacilityPanelHeader } from './components/FacilityPanelHeader'
import { FacilityScheduleSection } from './components/FacilityScheduleSection'
import { useAttendeePopover } from './hooks/use-attendee-popover'
import { useFacilityDelete } from './hooks/use-facility-delete'
import { useEmployees, useFacilities, useFacilityMeetings } from '@/lib/mock-loader'
import { deriveFacilityState } from '@/utils/facility-status'
import type { FacilityState } from '@/utils/facility-status'
import { useSelectedDate } from '@/contexts/selected-date-context'
import { useFacilityScheduleForDate } from '@/hooks/use-facility-schedule-for-date'
import { useQuantizedClock } from '@/hooks/use-quantized-clock'
import { useDetailPanel } from '@/contexts/detail-panel-context'
import { isSameJstDate, jstDateKey } from '@/utils/jst-date'

type Props = {
  facilityId: string
  onDeleted: (facilityName: string) => void
}

// 施設詳細: ヘッダー(アイコン・施設名・更新・状態バッジ・閉じる) + 現在の会議 + 日付別の予定 + 削除
export const FacilityDetail = ({ facilityId, onDeleted }: Props) => {
  const { data: facilities } = useFacilities()
  const { data: meetings } = useFacilityMeetings()
  const { data: employees } = useEmployees()
  const { date, debouncedDate, isTodaySelected, goToPrevDay, goToNextDay, goToToday } = useSelectedDate()
  const { closeTop } = useDetailPanel()
  const nowMs = useQuantizedClock(isTodaySelected)
  const popover = useAttendeePopover()
  const remove = useFacilityDelete({
    facilityId,
    facilityName: facilities?.find((f) => f.id === facilityId)?.name ?? '',
    onDeleted,
    onClose: closeTop,
  })

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
  const popoverMeeting = popover.state
    ? scheduleMeetings.find((m) => m.id === popover.state?.meetingId)
    : undefined

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
        attendee={{ onEnter: popover.onEnter, onLeave: popover.onLeave, onToggle: popover.onToggle }}
        onSwipePrevDay={goToPrevDay}
        onSwipeNextDay={goToNextDay}
      />

      <div className='fac-delete-footer'>
        <button type='button' className='fac-delete-btn' onClick={remove.open}>
          削除
        </button>
      </div>

      {remove.isDialogOpen && (
        <DeleteFacilityDialog
          facilityName={facility.name}
          isDeleting={remove.isDeleting}
          onConfirm={remove.confirm}
          onCancel={remove.cancel}
        />
      )}

      {popover.state && popoverMeeting && (
        <AttendeePopover
          state={popover.state}
          meeting={popoverMeeting}
          employees={employees ?? []}
          onMouseEnter={popover.cancelClose}
          onMouseLeave={popover.onLeave}
          onClose={popover.close}
        />
      )}
    </div>
  )
}
