import { useRef } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { PixelAvatar } from '@/components/PixelAvatar'
import { SEAT_STATUS_COLOR } from '../utils/seat-grid'
import { compactNameFontSize, getCompactNameLabel } from '../utils/compact-name'
import { PRESENCE_LABEL } from '@/utils/format'
import type { Employee, PresenceStatus, Seat } from '@/types'

// Compact 用の座席セル。縦積み(アバター上 + テキスト下)・姓のみ・椅子なし・回転反映なし。
// Desktop が onClick 直結なのに対し、こちらはスクロール誤爆対策のガードが多重に入る

type Props = {
  seat: Seat
  employee: Employee | null
  status: PresenceStatus
  teamName: string
  loading: boolean
  isHit: boolean
  glowing: boolean
  dimmed: boolean
  isScrollingRef: RefObject<boolean>
  onSelect: () => void
}

// pointerdown 位置からこれ以上動いたらタップ扱いしない
const TAP_MOVE_TOLERANCE_PX = 10
// これ以上長い押下は長押し扱いでタップ無効
const TAP_MAX_DURATION_MS = 600

export const ViewSeatCell = ({
  seat,
  employee,
  status,
  teamName,
  loading,
  isHit,
  glowing,
  dimmed,
  isScrollingRef,
  onSelect,
}: Props) => {
  const tap = useRef({ x: 0, y: 0, startedAt: 0, valid: false, fromPointer: false })

  const handlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const t = tap.current
    t.x = e.clientX
    t.y = e.clientY
    t.startedAt = e.timeStamp
    t.fromPointer = true
    // 慣性が流れている最中の押下は「止めるためのタップ」とみなして無効化する
    t.valid = !isScrollingRef.current
  }

  const handlePointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const t = tap.current
    if (!t.valid) return
    if (Math.hypot(e.clientX - t.x, e.clientY - t.y) > TAP_MOVE_TOLERANCE_PX) t.valid = false
  }

  const handlePointerCancel = () => {
    tap.current.valid = false
  }

  const handleClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    const t = tap.current
    const fromPointer = t.fromPointer
    t.fromPointer = false
    // detail === 0 はキーボード / スクリーンリーダー由来なので素通しする
    if (e.detail !== 0) {
      // pointer 起点が無い click は WKWebView がスクロール後に合成したもの
      if (!fromPointer) return
      if (!t.valid) return
      if (e.timeStamp - t.startedAt > TAP_MAX_DURATION_MS) return
    }
    onSelect()
  }

  if (!employee) {
    // 空席はボタン化しない
    return (
      <div data-seat-id={seat.id} className='team-ovl-cell is-empty'>
        <span className='team-ovl-cell-name'>空席</span>
      </div>
    )
  }

  const label = getCompactNameLabel(employee.name)

  return (
    <button
      type='button'
      data-seat-id={seat.id}
      className={`team-ovl-cell${isHit ? ' is-hit' : ''}${glowing ? ' is-glowing' : ''}`}
      style={{ opacity: dimmed ? 0.28 : 1 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
    >
      {/* 役職は文字では出さず上端 3px のバーだけで示す */}
      {employee.position && <span className='team-ovl-cell-accent' />}
      <span className='team-ovl-cell-avatar'>
        <PixelAvatar config={employee.avatar} size={28} />
      </span>
      <span className='team-ovl-cell-name' style={{ fontSize: compactNameFontSize(label) }}>
        {label}
      </span>
      <span className='team-ovl-cell-dept'>{teamName}</span>
      <span className='team-ovl-cell-status'>
        <span className='team-ovl-cell-statusdot' style={{ background: SEAT_STATUS_COLOR[status] }} />
        <span style={{ color: SEAT_STATUS_COLOR[status] }}>{loading ? '取得中…' : PRESENCE_LABEL[status]}</span>
      </span>
      {isHit && <span className='team-ovl-hit'>HIT</span>}
    </button>
  )
}
