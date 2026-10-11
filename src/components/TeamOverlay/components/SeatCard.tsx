import { useEmployeeAvatar } from '@/hooks/use-employee-avatar'
import { PixelAvatar } from '@/components/PixelAvatar'
import { hexToRgba } from '@/utils/color'
import { PRESENCE_COLOR, PRESENCE_LABEL } from '@/utils/format'
import type { Employee, PresenceStatus, Seat } from '@/types'
import styles from '../team-overlay-modal.module.css'

// Desktop 用の座席カード。横並び(アバター左 + テキスト右)・氏名フルネーム・椅子あり

type Props = {
  seat: Seat
  employee: Employee | null
  status: PresenceStatus
  teamName: string
  teamColor: string
  loading: boolean
  isHit: boolean
  dimmed: boolean
  onSelect: () => void
}

// 座席の向きをカードの並びに反映する
const DIRECTION: Record<Seat['rotation'], 'row' | 'column' | 'row-reverse' | 'column-reverse'> = {
  0: 'row',
  90: 'column',
  180: 'row-reverse',
  270: 'column-reverse',
}

export const SeatCard = ({ seat, employee, status, teamName, teamColor, loading, isHit, dimmed, onSelect }: Props) => {
  const avatarConfig = useEmployeeAvatar(employee)
  return (
  <button
    type='button'
    data-seat-id={seat.id}
    className={`${styles.card}${employee ? '' : ` ${styles.isEmpty}`}${isHit ? ` ${styles.isHit}` : ''}${dimmed ? ` ${styles.isDimmed}` : ''}`}
    disabled={!employee}
    style={{ flexDirection: DIRECTION[seat.rotation] }}
    onClick={onSelect}
  >
    {employee?.position && <span className={styles.cardAccent} />}
    <span className={styles.cardAvatar}>
      {employee ? <PixelAvatar config={avatarConfig} size={32} /> : null}
    </span>
    <span className={styles.cardText}>
      <span className={styles.cardName}>{employee ? employee.name : '空席'}</span>
      {/* 役職の有無でテキスト列の高さが変わり、.card の align-items: center により
          .cardName の開始 y が揺れるため、在職カードでは役職が無くても空 span を常時描画して
          行の高さを予約する(空席カードは対象外・従来どおり非表示) */}
      {employee && <span className={styles.cardPosition}>{employee.position ?? ''}</span>}
      {employee && <span className={styles.cardDept}>{teamName}</span>}
      {employee && (
        <span className={styles.cardStatus}>
          <span className={styles.cardStatusdot} style={{ background: PRESENCE_COLOR[status] }} />
          <span style={{ color: PRESENCE_COLOR[status] }}>{loading ? '取得中…' : PRESENCE_LABEL[status]}</span>
        </span>
      )}
    </span>
    {isHit && <span className={styles.hit}>HIT</span>}
    {/* 椅子: 空席は点線の円で位置だけ示す */}
    <span
      className={styles.cardDir}
      style={{
        border: employee ? `1.5px solid ${hexToRgba(teamColor, 0.7)}` : '1.5px dashed var(--color-border-strong)',
      }}
    />
  </button>
)
}
