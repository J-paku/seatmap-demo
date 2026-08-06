import { useEffect } from 'react'
import { SheetShell } from './SheetShell'
import { EmployeeDetail } from './EmployeeDetail'
import { FacilityDetail } from './FacilityDetail'
import { ScheduleDetail } from './ScheduleDetail'
import { useDetailPanel } from '@/contexts/detail-panel-context'
import { useFacilities, useSchedules } from '@/lib/mock-loader'

type Props = {
  // 施設削除の完了通知。トースト状態は SeatMapView が持つ
  onFacilityDeleted: (facilityName: string) => void
  // 座席の解決と遷移は SeatMapView が持つ(focus と canvasRef がそこにしか無い)
  onGoToSeat?: () => void
  showSeatUnsetNotice?: boolean
}

// 03: 詳細パネル群のオーケストレーター(排他=社員/施設・スタック=予定)
export const DetailPanels = ({ onFacilityDeleted, onGoToSeat, showSeatUnsetNotice }: Props) => {
  const { seatDetailId, personDetailId, facilityDetailId, scheduleDetailId, closeTop } = useDetailPanel()
  const { data: facilities } = useFacilities()
  const { data: schedules } = useSchedules()

  const anyOpen = seatDetailId !== null || personDetailId !== null || facilityDetailId !== null

  // ESC で最前面のみ閉じる。stopPropagation で window レベルの他リスナー(例: 背後の
  // TeamOverlay 自身の ESC ハンドラ)への伝播を止め、2段スタック中の誤同時クローズを防ぐ
  useEffect(() => {
    if (!anyOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      closeTop()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [anyOpen, closeTop])

  if (!anyOpen) return null

  const facility = facilityDetailId ? facilities?.find((f) => f.id === facilityDetailId) : null
  const scheduleEv = scheduleDetailId ? schedules?.find((s) => s.id === scheduleDetailId) : null

  return (
    <>
      {(seatDetailId || personDetailId) && (
        <SheetShell title='社員詳細' variant='employee' active={scheduleDetailId === null} onClose={closeTop}>
          <EmployeeDetail
            seatId={seatDetailId}
            employeeId={personDetailId}
            onGoToSeat={onGoToSeat}
            showSeatUnsetNotice={showSeatUnsetNotice}
          />
        </SheetShell>
      )}
      {facilityDetailId && facility && (
        <SheetShell title={facility.name} variant='facility' active onClose={closeTop} headerless>
          <FacilityDetail facilityId={facilityDetailId} onDeleted={onFacilityDeleted} />
        </SheetShell>
      )}
      {scheduleDetailId && scheduleEv && (
        <div className='sheet-stack-top'>
          <SheetShell title={scheduleEv.title} variant='schedule' active onClose={closeTop}>
            <ScheduleDetail eventId={scheduleDetailId} />
          </SheetShell>
        </div>
      )}
    </>
  )
}
