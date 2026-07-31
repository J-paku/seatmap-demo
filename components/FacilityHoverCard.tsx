import type { Employee, Facility } from '@/types'
import { FACILITY_COLOR, FACILITY_STATUS_LABEL, minToHHMM } from '@/utils/facility-status'
import type { FacilityState } from '@/utils/facility-status'

export type FacilityHoverPayload = { facilityId: string; rect: DOMRect }

type Props = {
  facility: Facility
  state: FacilityState
  empById: Map<string, Employee>
  rect: DOMRect
}

const clamp = (min: number, v: number, max: number) => Math.min(max, Math.max(min, v))

export const FacilityHoverCard = ({ facility, state, empById, rect }: Props) => {
  const color = FACILITY_COLOR[state.status]
  const nameOf = (id: string) => empById.get(id)?.name ?? id

  const left = clamp(0, rect.left + rect.width / 2 - 160, window.innerWidth - 320 - 8)
  const above = rect.top > 240
  const top = above ? Math.max(8, rect.top - 12) : Math.min(window.innerHeight - 12, rect.bottom + 12)

  return (
    <div
      className='fac-hover'
      style={{ left, top, transform: above ? 'translateY(-100%)' : 'none' }}
    >
      <div className='fac-hover-head'>
        <span className='material-symbols-outlined fac-hover-icon'>meeting_room</span>
        <span className='fac-hover-name'>{facility.name}</span>
        <span className='fac-hover-badge' style={{ background: color.bg, color: color.text }}>
          {FACILITY_STATUS_LABEL[state.status]}
        </span>
      </div>
      <div className='fac-hover-body'>
        {state.current ? (
          <>
            <div className='fac-hover-title'>{state.current.title}</div>
            <div className='fac-hover-line'>
              {minToHHMM(state.current.startMin)}–{minToHHMM(state.current.endMin)}
            </div>
            <div className='fac-hover-line'>主催: {nameOf(state.current.organizerId)}</div>
            <div className='fac-hover-line'>参加者 {state.current.participantIds.length}名</div>
          </>
        ) : null}
        <div className='fac-hover-next'>
          {state.next
            ? `次の予約: ${state.next.title} (${minToHHMM(state.next.startMin)}–${minToHHMM(state.next.endMin)})`
            : '本日の予約なし'}
        </div>
      </div>
    </div>
  )
}
