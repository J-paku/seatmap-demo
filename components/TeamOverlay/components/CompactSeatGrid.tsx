import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { ScrollHint } from './ScrollHint'
import { ViewSeatCell } from './ViewSeatCell'
import {
  COMPACT_SEAT_GAP_PX,
  COMPACT_SEAT_MIN_HEIGHT_PX,
  COMPACT_SIDE_PADDING_PX,
  COMPACT_VISIBLE_COLS,
} from '../utils/seat-grid'
import type { SeatGridProps } from '../type'
import { useScrollActivity } from '../lib/use-scroll-activity'
import { useScrollHints } from '../lib/use-scroll-hints'
import { useSeatHighlightAnimation } from '../lib/use-seat-highlight-animation'
import type { PresenceStatus } from '@/lib/types'

// 列幅は可変。6 列がコンテナ幅にちょうど収まる幅を実測して minmax の下限に使う

type Props = SeatGridProps

// コンテナ幅から 1 セルぶんの下限幅を求める
const useCompactCellWidth = (ref: RefObject<HTMLElement | null>): number => {
  const [cellWidth, setCellWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const inner = el.clientWidth - COMPACT_SIDE_PADDING_PX * 2
      const gaps = COMPACT_SEAT_GAP_PX * (COMPACT_VISIBLE_COLS - 1)
      setCellWidth(Math.max(0, Math.floor((inner - gaps) / COMPACT_VISIBLE_COLS)))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  return cellWidth
}

export const CompactSeatGrid = ({
  grid,
  employeeById,
  presenceMap,
  teamName,
  loading,
  highlightSeatId,
  onSeatClick,
  onClearHighlight,
}: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const cellWidth = useCompactCellWidth(scrollRef)
  const { hasOverflow } = useScrollHints(grid.cols)
  const isScrollingRef = useScrollActivity()
  const glowing = useSeatHighlightAnimation(scrollRef, highlightSeatId)
  const spotlight = highlightSeatId !== null

  // ヒントのタップで 1 列ぶんだけ滑らかに送る
  const nudge = (direction: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: direction * (cellWidth + COMPACT_SEAT_GAP_PX), behavior: 'smooth' })
  }

  return (
    <div className='team-ovl-gridwrap'>
      <div ref={scrollRef} className={`team-ovl-grid is-compact${loading ? ' is-loading' : ''}`} aria-busy={loading}>
        <div
          className='team-ovl-grid-inner'
          style={{
            gridTemplateColumns: `repeat(${grid.cols}, minmax(${cellWidth}px, 1fr))`,
            gridAutoRows: `minmax(${COMPACT_SEAT_MIN_HEIGHT_PX}px, auto)`,
            gap: COMPACT_SEAT_GAP_PX,
            width: '100%',
          }}
        >
          {grid.positionedSeats.map(({ seat, row, col }) => {
            const employee = seat.employeeId ? employeeById.get(seat.employeeId) ?? null : null
            const status: PresenceStatus = employee ? presenceMap.get(employee.id) ?? 'present' : 'present'
            const isHit = highlightSeatId === seat.id
            const dimmed = spotlight && !isHit
            return (
              <div key={seat.id} style={{ gridRow: row + 1, gridColumn: col + 1, display: 'flex' }}>
                <ViewSeatCell
                  seat={seat}
                  employee={employee}
                  status={status}
                  teamName={teamName}
                  loading={loading}
                  isHit={isHit}
                  glowing={glowing && isHit}
                  dimmed={dimmed}
                  isScrollingRef={isScrollingRef}
                  onSelect={() => {
                    if (dimmed) {
                      onClearHighlight?.()
                      return
                    }
                    onSeatClick(seat.id)
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
      {/* onNudge を渡す = ボタン化 */}
      {hasOverflow && <ScrollHint side='left' onNudge={() => nudge(-1)} />}
      {hasOverflow && <ScrollHint side='right' onNudge={() => nudge(1)} />}
    </div>
  )
}
