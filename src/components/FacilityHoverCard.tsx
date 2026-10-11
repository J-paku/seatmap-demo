import type { Employee, Facility } from '@/types'
import { FACILITY_COLOR, FACILITY_STATUS_LABEL, minToHHMM } from '@/utils/facility-status'
import type { FacilityState } from '@/utils/facility-status'
import styles from './seatmap.module.css'

export type FacilityHoverPayload = { facilityId: string; rect: DOMRect }

// 実測定数。カード幅と画面端の余白、対象との隙間
const CARD_WIDTH_PX = 320
const EDGE_MARGIN_PX = 8
const GAP_PX = 12
// これより下にある会議室は上向きに出す
const ABOVE_THRESHOLD_PX = 240

type Props = {
  facility: Facility
  state: FacilityState
  empById: Map<string, Employee>
  rect: DOMRect
}

const clamp = (min: number, v: number, max: number) => Math.min(max, Math.max(min, v))

// 下段は3分岐。未連携 → 次の予約あり → それ以外 の順に決まる
const footerText = (facility: Facility, state: FacilityState): string => {
  if (!facility.facilityId) return '施設を連携してください'
  if (state.next) {
    return `次の予約: ${state.next.title} (${minToHHMM(state.next.startMin)}-${minToHHMM(state.next.endMin)})`
  }
  return '本日の予約なし'
}

// 会議室のホバーカード(PC)。マウス以外では呼び出し側が出さない
export const FacilityHoverCard = ({ facility, state, empById, rect }: Props) => {
  const color = FACILITY_COLOR[state.status]
  const nameOf = (id: string) => empById.get(id)?.name ?? id

  const left = clamp(
    EDGE_MARGIN_PX,
    rect.left + rect.width / 2 - CARD_WIDTH_PX / 2,
    window.innerWidth - CARD_WIDTH_PX - EDGE_MARGIN_PX
  )
  const above = rect.top > ABOVE_THRESHOLD_PX
  const top = above
    ? Math.max(EDGE_MARGIN_PX, rect.top - GAP_PX)
    : Math.min(window.innerHeight - GAP_PX, rect.bottom + GAP_PX)

  return (
    <div className={styles.facHover} style={{ left, top, transform: above ? 'translateY(-100%)' : 'none' }}>
      <div className={styles.facHoverHead}>
        <span className={`material-symbols-outlined ${styles.facHoverIcon}`}>meeting_room</span>
        <span className={styles.facHoverName}>{facility.name}</span>
        <span className={styles.facHoverBadge} style={{ background: color.bg, color: color.text }}>
          {FACILITY_STATUS_LABEL[state.status]}
        </span>
      </div>

      {/* 現在の会議は会議中のときだけ出す(空室に現在会議が付くのは誤り) */}
      {state.status === 'in_meeting' && state.current && (
        <div className={styles.facHoverBody}>
          <div className={styles.facHoverTitle}>{state.current.title || '予定あり'}</div>
          <div className={styles.facHoverLine}>
            {minToHHMM(state.current.startMin)}-{minToHHMM(state.current.endMin)}
          </div>
          <div className={styles.facHoverLine}>
            <span className={`material-symbols-outlined ${styles.facHoverMetaIcon}`} aria-hidden='true'>
              person
            </span>
            主催: {nameOf(state.current.organizerId)}
          </div>
          <div className={styles.facHoverLine}>
            <span className={`material-symbols-outlined ${styles.facHoverMetaIcon}`} aria-hidden='true'>
              groups
            </span>
            {state.current.participantIds.length}名
          </div>
        </div>
      )}

      <div className={styles.facHoverNext}>{footerText(facility, state)}</div>
    </div>
  )
}
