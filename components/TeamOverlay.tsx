import { useEffect, useMemo, useRef, useState } from 'react'
import { PixelAvatar } from './PixelAvatar'
import { hexToRgba } from '@/lib/color'
import { PRESENCE_LABEL } from '@/lib/types'
import type { Employee, PresenceStatus, Seat } from '@/lib/types'

// 10: チームバウンダリクリックで開く大型オーバーレイ(座席グリッド全体)
// クリックしたバウンダリ中心から膨らむように開く。中央固定拡大ではない

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

// 人の状態色(10-main-interactions の正本表・4種のみ保持)
const STATUS_COLOR: Record<PresenceStatus, string> = {
  present: '#16a34a',
  meeting: '#2563eb',
  out: '#d97706',
  vacation: '#6b7280',
}

// PC グリッドの列数(座席数からおおよそ正方に近づける)
const columnsFor = (count: number): number => {
  if (count <= 1) return 1
  return Math.min(count, Math.max(3, Math.ceil(Math.sqrt(count))))
}

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
  const panelRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

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

  const teamSeats = useMemo(
    () => (payload ? seats.filter((s) => s.teamId === payload.teamId) : []),
    [seats, payload]
  )
  const occupiedCount = useMemo(() => teamSeats.filter((s) => s.employeeId).length, [teamSeats])
  const cols = columnsFor(teamSeats.length)

  if (!payload) return null

  const { teamColor, teamName, rect } = payload
  // クリック位置から膨らむ拡大原点(8〜92%)
  const originX = Math.min(92, Math.max(8, ((rect.left + rect.width / 2) / window.innerWidth) * 100))
  const originY = Math.min(92, Math.max(8, ((rect.top + rect.height / 2) / window.innerHeight) * 100))

  const spotlight = highlightSeatId !== null

  return (
    <div
      className='team-ovl-wrap'
      onClick={(e) => {
        // ラッパー余白クリックで閉じる(パネル自身のクリックは stopPropagation)
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className='team-ovl-backdrop' onClick={onClose} />
      <div
        ref={panelRef}
        className='team-ovl-panel'
        role='dialog'
        aria-modal='true'
        aria-label={`${teamName} 座席配置`}
        style={{
          transformOrigin: `${originX}% ${originY}%`,
          pointerEvents: clickLocked ? 'none' : 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {loading && <div className='team-ovl-loadbar' style={{ background: teamColor }} />}
        {/* ヘッダー */}
        <header
          className='team-ovl-header'
          style={{ background: `linear-gradient(120deg, ${hexToRgba(teamColor, 0.13)} 0%, var(--color-surface) 42%, var(--color-surface) 100%)` }}
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
            <div className='team-ovl-section-head'>
              <span className='material-symbols-outlined team-ovl-section-icon'>grid_view</span>
              <span className='team-ovl-section-title'>座席配置</span>
              <span className='team-ovl-section-count'>{teamSeats.length}席</span>
            </div>
            <div className='team-ovl-sync'>
              {loading ? '最新スケジュールを取得中…' : `最終取得 ${syncedAt}`}
            </div>

            <div className={`team-ovl-grid${loading ? ' is-loading' : ''}`} aria-busy={loading}>
              <div
                className='team-ovl-grid-inner'
                style={{ gridTemplateColumns: `repeat(${cols}, 180px)` }}
              >
                {teamSeats.map((seat) => {
                  const emp = seat.employeeId ? employeeById.get(seat.employeeId) ?? null : null
                  const status: PresenceStatus = emp ? presenceMap.get(emp.id) ?? 'present' : 'present'
                  const isEmpty = !emp
                  const isHit = highlightSeatId === seat.id
                  const dimmed = spotlight && !isHit
                  return (
                    <button
                      key={seat.id}
                      type='button'
                      className={`team-ovl-card${isEmpty ? ' is-empty' : ''}${isHit ? ' is-hit' : ''}`}
                      disabled={isEmpty}
                      style={{ opacity: dimmed ? 0.28 : 1 }}
                      onClick={() => {
                        if (isEmpty) return
                        if (dimmed) {
                          onClearHighlight?.()
                          return
                        }
                        onSeatClick(seat.id)
                      }}
                    >
                      {emp?.position && <span className='team-ovl-card-accent' />}
                      <span className='team-ovl-card-avatar'>
                        {emp ? <PixelAvatar config={emp.avatar} size={32} /> : null}
                      </span>
                      <span className='team-ovl-card-text'>
                        <span className='team-ovl-card-name'>{emp ? emp.name : '空席'}</span>
                        {emp?.position && <span className='team-ovl-card-position'>{emp.position}</span>}
                        {emp && <span className='team-ovl-card-dept'>{teamName}</span>}
                        {emp && (
                          <span className='team-ovl-card-status'>
                            <span className='team-ovl-card-statusdot' style={{ background: STATUS_COLOR[status] }} />
                            <span style={{ color: STATUS_COLOR[status] }}>
                              {loading ? '取得中…' : PRESENCE_LABEL[status]}
                            </span>
                          </span>
                        )}
                      </span>
                      {isHit && <span className='team-ovl-hit'>HIT</span>}
                      <span
                        className='team-ovl-card-dir'
                        style={{
                          border: emp
                            ? `1.5px solid ${hexToRgba(teamColor, 0.7)}`
                            : '1.5px dashed var(--color-border-strong)',
                        }}
                      />
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
