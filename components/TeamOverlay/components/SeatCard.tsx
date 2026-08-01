import { useEmployeeAvatar } from '@/hooks/use-employee-avatar'
import { PixelAvatar } from '@/components/PixelAvatar'
import { hexToRgba } from '@/utils/color'
import { SEAT_STATUS_COLOR } from '../utils/seat-grid'
import { PRESENCE_LABEL } from '@/utils/format'
import type { Employee, PresenceStatus, Seat } from '@/types'

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
    className={`team-ovl-card${employee ? '' : ' is-empty'}${isHit ? ' is-hit' : ''}${dimmed ? ' is-dimmed' : ''}`}
    disabled={!employee}
    style={{ flexDirection: DIRECTION[seat.rotation] }}
    onClick={onSelect}
  >
    {employee?.position && <span className='team-ovl-card-accent' />}
    <span className='team-ovl-card-avatar'>
      {employee ? <PixelAvatar config={avatarConfig} size={32} /> : null}
    </span>
    <span className='team-ovl-card-text'>
      <span className='team-ovl-card-name'>{employee ? employee.name : '空席'}</span>
      {employee?.position && <span className='team-ovl-card-position'>{employee.position}</span>}
      {employee && <span className='team-ovl-card-dept'>{teamName}</span>}
      {employee && (
        <span className='team-ovl-card-status'>
          <span className='team-ovl-card-statusdot' style={{ background: SEAT_STATUS_COLOR[status] }} />
          <span style={{ color: SEAT_STATUS_COLOR[status] }}>{loading ? '取得中…' : PRESENCE_LABEL[status]}</span>
        </span>
      )}
    </span>
    {isHit && <span className='team-ovl-hit'>HIT</span>}
    {/* 椅子: 空席は点線の円で位置だけ示す */}
    <span
      className='team-ovl-card-dir'
      style={{
        border: employee ? `1.5px solid ${hexToRgba(teamColor, 0.7)}` : '1.5px dashed var(--color-border-strong)',
      }}
    />
  </button>
)
}
