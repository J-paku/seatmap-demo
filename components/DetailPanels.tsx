import { useEffect } from 'react'
import { SheetShell } from './SheetShell'
import { EmployeeDetail } from './EmployeeDetail'
import { FacilityDetail } from './FacilityDetail'
import { ScheduleDetail } from './ScheduleDetail'
import { useDetailPanel } from '@/lib/detail-panel-context'
import { useFacilities, useSchedules } from '@/lib/mock-loader'

// 03: 詳細パネル群のオーケストレーター(排他=社員/施設・スタック=予定)
export const DetailPanels = () => {
  const { seatDetailId, facilityDetailId, scheduleDetailId, closeTop } = useDetailPanel()
  const { data: facilities } = useFacilities()
  const { data: schedules } = useSchedules()

  const anyOpen = seatDetailId !== null || facilityDetailId !== null

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
      {seatDetailId && (
        <SheetShell title='社員詳細' variant='employee' active={scheduleDetailId === null} onClose={closeTop}>
          <EmployeeDetail seatId={seatDetailId} />
        </SheetShell>
      )}
      {facilityDetailId && facility && (
        <SheetShell title={facility.name} variant='facility' active showHandle onClose={closeTop}>
          <FacilityDetail facilityId={facilityDetailId} />
        </SheetShell>
      )}
      {scheduleDetailId && scheduleEv && (
        <div className='sheet-stack-top'>
          <SheetShell title={scheduleEv.title} variant='schedule' active showHandle onClose={closeTop}>
            <ScheduleDetail eventId={scheduleDetailId} />
          </SheetShell>
        </div>
      )}
    </>
  )
}
