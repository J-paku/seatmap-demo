import { useMemo } from 'react'
import { FacilityPanelHeader } from './components/FacilityPanelHeader'
import { useEmployees, useFacilities, useFacilityMeetings } from '@/lib/mock-loader'
import { deriveFacilityState, minToHHMM } from '@/utils/facility-status'
import type { FacilityState } from '@/utils/facility-status'
import { useSelectedDate } from '@/contexts/selected-date-context'
import { useQuantizedClock } from '@/hooks/use-quantized-clock'
import { useDetailPanel } from '@/contexts/detail-panel-context'

// 施設詳細: ヘッダー(アイコン・施設名・更新・状態バッジ・閉じる) + 現在の会議 + 本日の予定
export const FacilityDetail = ({ facilityId }: { facilityId: string }) => {
  const { data: facilities } = useFacilities()
  const { data: meetings } = useFacilityMeetings()
  const { data: employees } = useEmployees()
  const { isTodaySelected } = useSelectedDate()
  const { closeTop } = useDetailPanel()
  const nowMs = useQuantizedClock(isTodaySelected)

  const empById = useMemo(() => new Map((employees ?? []).map((e) => [e.id, e])), [employees])
  const facility = facilities?.find((f) => f.id === facilityId)

  if (!facility) return null

  const now = new Date(nowMs)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const state: FacilityState = deriveFacilityState(facility, meetings ?? [], nowMin)
  const mine = (meetings ?? [])
    .filter((m) => facility.facilityId && m.facilityId === facility.facilityId)
    .sort((a, b) => a.startMin - b.startMin)
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

      <div className='fac-section-title'>本日の予定</div>
      {!facility.facilityId ? (
        <div className='fac-empty'>施設未連携</div>
      ) : mine.length === 0 ? (
        <div className='fac-empty'>本日の予約はありません</div>
      ) : (
        <ul className='fac-list'>
          {mine.map((m) => (
            <li key={m.id} className={isTodaySelected && state.current?.id === m.id ? 'is-now' : ''}>
              <span className='fac-list-time'>
                {minToHHMM(m.startMin)}–{minToHHMM(m.endMin)}
              </span>
              <span className='fac-list-title'>{m.title}</span>
              <span className='fac-list-parts'>{m.participantIds.length}名</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
