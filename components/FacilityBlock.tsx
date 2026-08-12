import type { Facility } from '@/types'
import { FACILITY_COLOR, FACILITY_STATUS_LABEL } from '@/utils/facility-status'
import type { FacilityState } from '@/utils/facility-status'
import type { FacilityHoverPayload } from './FacilityHoverCard'
import styles from './seatmap.module.css'

type Props = {
  facility: Facility
  counterScale: number
  onSelect: (facilityId: string) => void
  state?: FacilityState
  lod?: 'detail' | 'mid' | 'overview'
  onHover?: (payload: FacilityHoverPayload | null) => void
}

export const FacilityBlock = ({ facility, counterScale, onSelect, state, lod = 'detail', onHover }: Props) => {
  // 11: 通路は会議室コードパスから完全除外(data-facility無し・クリック無し・破線コリドー表示のみ)
  if (facility.kind === 'aisle') {
    const isVertical = facility.height > facility.width
    return (
      <div
        className={styles.aisleBlock}
        data-kind='aisle'
        data-furniture-id={facility.id}
        style={{ left: facility.x, top: facility.y, width: facility.width, height: facility.height }}
      >
        <span className={styles.aisleLabel} style={{ transform: isVertical ? 'rotate(90deg)' : undefined }}>
          ── 通路 ──
        </span>
      </div>
    )
  }

  const isMeeting = facility.kind === 'meeting'
  const color = isMeeting && state ? FACILITY_COLOR[state.status] : null

  return (
    <div
      className={styles.facilityBlock}
      data-kind={facility.kind}
      data-furniture-id={facility.id}
      data-facility={isMeeting ? 'true' : undefined}
      role='button'
      tabIndex={-1}
      onClick={() => onSelect(facility.id)}
      onPointerEnter={(e) => {
        if (isMeeting && e.pointerType === 'mouse') onHover?.({ facilityId: facility.id, rect: e.currentTarget.getBoundingClientRect() })
      }}
      onPointerLeave={() => onHover?.(null)}
      style={{
        left: facility.x,
        top: facility.y,
        width: facility.width,
        height: facility.height,
        cursor: 'pointer',
        ...(color ? { background: color.bg, borderColor: color.border, color: color.text } : {}),
      }}
    >
      {/* 05-3: ラベル表示トグル。未指定は表示(既定値の穴埋めは lib/layout-persistence が持つ) */}
      {facility.labelVisible !== false && (
        <span className={styles.facilityName} style={{ fontSize: 15 * counterScale }}>
          {facility.name}
        </span>
      )}
      {isMeeting && state && (
        <span className={styles.facilityStatus} style={{ fontSize: 10 * counterScale }}>
          {FACILITY_STATUS_LABEL[state.status]}
        </span>
      )}
      {isMeeting && lod === 'detail' && state?.current && (
        <>
          <span className={styles.facilityMeetingTitle} style={{ fontSize: 9 * counterScale }}>
            {state.current.title}
          </span>
          <span className={styles.facilityMeetingParts} style={{ fontSize: 8 * counterScale }}>
            出席者{state.current.participantIds.length}名
          </span>
        </>
      )}
    </div>
  )
}
