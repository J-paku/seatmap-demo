import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { SheetShell } from './SheetShell'
import { EmployeeDetail } from './EmployeeDetail'
import { FacilityDetail } from './FacilityDetail'
import { ScheduleDetail } from './ScheduleDetail'
import { scheduleTitleLabel } from '@/utils/format'
import { useDetailPanel } from '@/contexts/detail-panel-context'
import { useFacilities, useSchedules } from '@/lib/mock-loader'
import styles from './sheet.module.css'

type Props = {
  // 施設削除の完了通知。トースト状態は SeatMapView が持つ
  onFacilityDeleted: (facilityName: string) => void
  // 座席の解決と遷移は SeatMapView が持つ(focus と canvasRef がそこにしか無い)
  onGoToSeat?: () => void
  showSeatUnsetNotice?: boolean
}

// 施設の上に社員カードを載せる時だけ z を1段上げる包み。単独表示の時は余計な div を挟まない
const ConditionalStackTop = ({ stacked, children }: { stacked: boolean; children: ReactNode }) =>
  stacked ? <div className={styles.stackTop}>{children}</div> : <>{children}</>

// 03: 詳細パネル群のオーケストレーター(社員は施設の上へスタック・スタック=予定)
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

  // 描画順(下→上)は detail-panel-context.tsx の DETAIL_PANEL_LAYER_ORDER
  // (facility → employee → schedule)が正。closeTop もそこから同じ順を辿って畳むため、
  // 重なりを変える時は両方を見直すこと(#15)
  return (
    <>
      {facilityDetailId && facility && (
        <SheetShell
          title={facility.name}
          variant='facility'
          active={seatDetailId === null && personDetailId === null}
          onClose={closeTop}
          headerless
        >
          <FacilityDetail facilityId={facilityDetailId} onDeleted={onFacilityDeleted} />
        </SheetShell>
      )}
      {(seatDetailId || personDetailId) && (
        // 施設詳細(参加者ポップオーバー)から開いた時は施設の上へ重ねる(stackTop 段)
        <ConditionalStackTop stacked={facilityDetailId !== null}>
          <SheetShell title='社員詳細' variant='employee' active={scheduleDetailId === null} onClose={closeTop}>
            <EmployeeDetail
              seatId={seatDetailId}
              employeeId={personDetailId}
              onGoToSeat={onGoToSeat}
              showSeatUnsetNotice={showSeatUnsetNotice}
            />
          </SheetShell>
        </ConditionalStackTop>
      )}
      {scheduleDetailId && scheduleEv && (
        // stackTop(施設→社員の段)とは別の stackSchedule 段を使う。社員が施設の上に
        // スタック中でも予定を確実に最前面へ出すため(sheet.module.css 参照)
        <div className={styles.stackSchedule}>
          <SheetShell title={scheduleTitleLabel(scheduleEv)} variant='schedule' active onClose={closeTop}>
            <ScheduleDetail eventId={scheduleDetailId} />
          </SheetShell>
        </div>
      )}
    </>
  )
}
