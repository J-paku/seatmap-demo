import { useRef } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { useEmployeeAvatar } from '@/hooks/use-employee-avatar'
import { PixelAvatar } from '@/components/PixelAvatar'
import { compactNameFontSize, getCompactNameLabel } from '../utils/compact-name'
import styles from '../team-overlay-modal.module.css'
import { PRESENCE_COLOR, PRESENCE_LABEL } from '@/utils/format'
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
  const avatarConfig = useEmployeeAvatar(employee)
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
    // 空席はボタン化しない。スポットライト中は空席も落とす
    // (ここを外すと空席だけが最前面の明るさで残り、ヒット席より目立ってしまう。Desktop 側は同じ要素なので既に落ちている)
    return (
      <div data-seat-id={seat.id} className={`${styles.cell} ${styles.isEmpty}${dimmed ? ` ${styles.isDimmed}` : ''}`}>
        <span className={styles.cellName}>空席</span>
      </div>
    )
  }

  const label = getCompactNameLabel(employee.name)

  return (
    <button
      type='button'
      data-seat-id={seat.id}
      className={`${styles.cell}${isHit ? ` ${styles.isHit}` : ''}${glowing ? ` ${styles.isGlowing}` : ''}${dimmed ? ` ${styles.isDimmed}` : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
    >
      {/* 役職は文字では出さず上端 3px のバーだけで示す */}
      {employee.position && <span className={styles.cellAccent} />}
      <span className={styles.cellAvatar}>
        <PixelAvatar config={avatarConfig} size={28} />
      </span>
      <span className={styles.cellName} style={{ fontSize: compactNameFontSize(label) }}>
        {label}
      </span>
      <span className={styles.cellDept}>{teamName}</span>
      <span className={styles.cellStatus}>
        <span className={styles.cellStatusdot} style={{ background: PRESENCE_COLOR[status] }} />
        <span style={{ color: PRESENCE_COLOR[status] }}>{loading ? '取得中…' : PRESENCE_LABEL[status]}</span>
      </span>
      {isHit && <span className={styles.hit}>HIT</span>}
    </button>
  )
}
