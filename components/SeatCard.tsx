import { memo } from 'react'
import { PixelAvatar } from './PixelAvatar'
import type { Employee, PresenceStatus, Seat } from '@/lib/types'
import { PRESENCE_LABEL } from '@/lib/types'

// LOD: detail=アバター+名前+状態 / mid=アバター+状態ドット(名前省略)
export type Lod = 'detail' | 'mid' | 'overview'

type Props = {
  seat: Seat
  employee: Employee | null
  status: PresenceStatus
  selected: boolean
  // 05: ディレクトリからのジャンプ着地時の強調パルス(任意・既定 false)
  pulsing?: boolean
  lod: Lod
  counterScale: number
  onSelect: (seatId: string) => void
  // 07: 編集モード中のみ付与(ドラッグ開始・選択枠表示)。閲覧モードでは常に undefined
  isEditMode?: boolean
  isEditDragging?: boolean
  onEditPointerDown?: (seatId: string, e: React.PointerEvent) => void
}

const STATUS_VAR: Record<PresenceStatus, string> = {
  present: 'var(--color-status-present)',
  meeting: 'var(--color-status-meeting)',
  out: 'var(--color-status-out)',
  vacation: 'var(--color-status-vacation)',
}

const SeatCardInner = ({
  seat,
  employee,
  status,
  selected,
  pulsing,
  lod,
  counterScale,
  onSelect,
  isEditMode,
  isEditDragging,
  onEditPointerDown,
}: Props) => {
  const isEmpty = employee === null
  const showName = lod === 'detail'

  return (
    <div
      className={`seat-card${isEmpty ? ' is-empty' : ''}${selected ? ' is-selected' : ''}${pulsing ? ' is-jump-pulse' : ''}${isEditMode ? ' is-edit-mode' : ''}${isEditDragging ? ' is-edit-dragging' : ''}`}
      style={{
        left: seat.x,
        top: seat.y,
        width: seat.width,
        height: seat.height,
        transform: seat.rotation ? `rotate(${seat.rotation}deg)` : undefined,
      }}
      onClick={(e) => {
        // 編集モードは選択がpointerdown側で確定済みのため、背景クリック(選択解除)への伝播を止める
        if (isEditMode) e.stopPropagation()
        onSelect(seat.id)
      }}
      onPointerDown={isEditMode ? (e) => onEditPointerDown?.(seat.id, e) : undefined}
      role='button'
      tabIndex={-1}
      aria-label={employee ? employee.name : '空席'}
    >
      {isEmpty ? (
        <span className='seat-empty-pill'>空席</span>
      ) : (
        <>
          {employee.position && <div className='seat-accent-bar' />}
          <div className='seat-avatar-frame'>
            <PixelAvatar config={employee.avatar} size={28} />
          </div>
          {showName && <div className='seat-name'>{employee.name}</div>}
          <div className='seat-status-row' style={{ ['--status-color' as string]: STATUS_VAR[status] }}>
            <span className='seat-status-dot' />
            {showName && (
              <span className='seat-status-label' style={{ fontSize: 9 * counterScale }}>
                {PRESENCE_LABEL[status]}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export const SeatCard = memo(SeatCardInner)
