import { useEffect, useMemo, useRef, useState } from 'react'
import { SeatGridFrame } from './team-overlay/SeatGridFrame'
import { SheetDragHandle } from './team-overlay/SheetDragHandle'
import { hexToRgba } from '@/lib/color'
import { COMPACT_SIDE_PADDING_PX, buildSeatGrid } from '@/lib/seat-grid'
import type { Employee, PresenceStatus, Seat } from '@/lib/types'
import { useIsCompactMobile } from '@/lib/use-compact-mobile'
import { useSwipeDismiss } from '@/lib/use-swipe-dismiss'

// 10: チームバウンダリクリックで開く大型オーバーレイ(座席グリッド全体)
// クリックしたバウンダリ中心から膨らむように開く。中央固定拡大ではない
// 幅 760px を境に、シェル形状・座席グリッド・入力モデルがまるごと切り替わる

export type TeamOverlayPayload = {
  teamId: string
  teamName: string
  teamColor: string
  rect: DOMRect
}

type Props = {
  payload: TeamOverlayPayload | null
  seats: Seat[]
  employeeById: Map<string, Employee>
  presenceMap: Map<string, PresenceStatus>
  onClose: () => void
  onSeatClick: (seatId: string) => void
  highlightSeatId?: string | null
  onClearHighlight?: () => void
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])'

export const TeamOverlay = ({
  payload,
  seats,
  employeeById,
  presenceMap,
  onClose,
  onSeatClick,
  highlightSeatId = null,
  onClearHighlight,
}: Props) => {
  const [loading, setLoading] = useState(true)
  const [clickLocked, setClickLocked] = useState(true)
  const [syncedAt, setSyncedAt] = useState<string>('')
  const bodyRef = useRef<HTMLDivElement>(null)
  const isCompactMobile = useIsCompactMobile()
  // 表示中のみ有効化。下スワイプで閉じるのは Compact だけの挙動
  const { sheetRef, bind } = useSwipeDismiss({
    onClose,
    enabled: payload !== null && isCompactMobile,
    scrollGateRef: bodyRef,
  })

  // オープン時: ローディングシミュレーション(300〜600ms)+ 350ms クリックロック
  useEffect(() => {
    if (!payload) return
    setLoading(true)
    setClickLocked(true)
    const delay = 300 + Math.floor(Math.random() * 300)
    const t1 = setTimeout(() => {
      setLoading(false)
      const now = new Date()
      setSyncedAt(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
    }, delay)
    const t2 = setTimeout(() => setClickLocked(false), 350)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [payload])

  // 開くたびに本文スクロールを先頭へ戻す
  useEffect(() => {
    if (!payload) return
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }, [payload])

  // body スクロールロック + ESC で閉じる
  useEffect(() => {
    if (!payload) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [payload, onClose])

  // フォーカストラップ(PC / モバイル共通)
  useEffect(() => {
    if (!payload) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const sheet = sheetRef.current
      if (!sheet) return
      const items = [...sheet.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const activeEl = document.activeElement as HTMLElement | null
      if (e.shiftKey && activeEl === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [payload, sheetRef])

  const teamSeats = useMemo(
    () => (payload ? seats.filter((s) => s.teamId === payload.teamId) : []),
    [seats, payload]
  )
  const grid = useMemo(() => buildSeatGrid(teamSeats), [teamSeats])
  const occupiedCount = useMemo(() => teamSeats.filter((s) => s.employeeId).length, [teamSeats])

  if (!payload) return null

  const { teamColor, teamName, rect } = payload
  // クリック位置から膨らむ拡大原点(8〜92%)。PC / モバイル共通
  const originX = Math.min(92, Math.max(8, ((rect.left + rect.width / 2) / window.innerWidth) * 100))
  const originY = Math.min(92, Math.max(8, ((rect.top + rect.height / 2) / window.innerHeight) * 100))
  const sidePadding = isCompactMobile ? COMPACT_SIDE_PADDING_PX : 0

  return (
    <div
      className={`team-ovl-wrap${isCompactMobile ? ' is-compact' : ''}`}
      onClick={(e) => {
        // ラッパー余白クリックで閉じる(パネル自身のクリックは stopPropagation)
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className='team-ovl-backdrop' onClick={onClose} />
      <div
        ref={sheetRef}
        className={`team-ovl-panel${isCompactMobile ? ' is-compact' : ''}`}
        role='dialog'
        aria-modal='true'
        aria-label={`${teamName} 座席配置`}
        style={{
          transformOrigin: `${originX}% ${originY}%`,
          pointerEvents: clickLocked ? 'none' : 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
        {...bind}
      >
        {loading && <div className='team-ovl-loadbar' style={{ background: teamColor }} />}
        {/* ハンドルは Compact のみ描画する */}
        {isCompactMobile && <SheetDragHandle onClose={onClose} />}
        {/* ヘッダー */}
        <header
          className='team-ovl-header'
          style={{
            background: `linear-gradient(120deg, ${hexToRgba(teamColor, 0.13)} 0%, var(--color-surface) 42%, var(--color-surface) 100%)`,
            paddingTop: isCompactMobile ? 28 : 12,
          }}
        >
          <span
            className='team-ovl-dot'
            style={{ background: teamColor, boxShadow: `0 0 0 5px ${hexToRgba(teamColor, 0.13)}` }}
          />
          <span className='team-ovl-title'>{teamName}</span>
          <span className='team-ovl-count' style={{ borderColor: teamColor, color: teamColor }}>
            {occupiedCount}名
          </span>
          <button type='button' className='team-ovl-close' aria-label='閉じる' onClick={onClose}>
            <span className='material-symbols-outlined'>close</span>
          </button>
        </header>

        {/* 本文 — 座席配置セクション */}
        <div ref={bodyRef} className='team-ovl-body'>
          <section className='team-ovl-section'>
            {/* 中身は分岐しない。モバイルのときだけグリッド左右パディングに揃える */}
            <div className='team-ovl-section-head' style={{ paddingLeft: sidePadding, paddingRight: sidePadding }}>
              <span className='material-symbols-outlined team-ovl-section-icon'>grid_view</span>
              <span className='team-ovl-section-title'>座席配置</span>
              <span className='team-ovl-section-count'>{teamSeats.length}席</span>
            </div>
            <div className='team-ovl-sync' style={{ paddingLeft: sidePadding, paddingRight: sidePadding }}>
              {loading ? '最新スケジュールを取得中…' : `最終取得 ${syncedAt}`}
            </div>

            <SeatGridFrame
              isCompactMobile={isCompactMobile}
              grid={grid}
              employeeById={employeeById}
              presenceMap={presenceMap}
              teamName={teamName}
              teamColor={teamColor}
              loading={loading}
              highlightSeatId={highlightSeatId}
              onSeatClick={onSeatClick}
              onClearHighlight={onClearHighlight}
            />
          </section>
        </div>
      </div>
    </div>
  )
}
