import type { Facility } from '@/lib/types'
import { FACILITY_STATUS_LABEL } from '@/lib/types'
import { FACILITY_COLOR } from '@/lib/facility-status'
import type { FacilityState } from '@/lib/facility-status'

type Props = {
  facility: Facility
  counterScale: number
  onSelect: (facilityId: string) => void
  state?: FacilityState
  lod?: 'detail' | 'mid' | 'overview'
}

export const FacilityBlock = ({ facility, counterScale, onSelect, state, lod = 'detail' }: Props) => {
  const isMeeting = facility.kind === 'meeting'
  const color = isMeeting && state ? FACILITY_COLOR[state.status] : null

  return (
    <div
      className='facility-block'
      data-kind={facility.kind}
      data-facility={isMeeting ? 'true' : undefined}
      role='button'
      tabIndex={-1}
      onClick={() => onSelect(facility.id)}
      style={{
        left: facility.x,
        top: facility.y,
        width: facility.width,
        height: facility.height,
        cursor: 'pointer',
        ...(color ? { background: color.bg, borderColor: color.border, color: color.text } : {}),
      }}
    >
      <span className='facility-name' style={{ fontSize: 15 * counterScale }}>
        {facility.name}
      </span>
      {isMeeting && state && (
        <span className='facility-status' style={{ fontSize: 10 * counterScale }}>
          {FACILITY_STATUS_LABEL[state.status]}
        </span>
      )}
      {isMeeting && lod === 'detail' && state?.current && (
        <>
          <span className='facility-meeting-title' style={{ fontSize: 9 * counterScale }}>
            {state.current.title}
          </span>
          <span className='facility-meeting-parts' style={{ fontSize: 8 * counterScale }}>
            参加者{state.current.participantIds.length}名
          </span>
        </>
      )}
    </div>
  )
}
