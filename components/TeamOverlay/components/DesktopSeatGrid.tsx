import { useRef } from 'react'
import { ScrollHint } from './ScrollHint'
import { SeatCard } from './SeatCard'
import { DESKTOP_SEAT_CARD_WIDTH_PX, DESKTOP_SEAT_GAP_PX, gridCellKey } from '../utils/seat-grid'
import type { SeatGridProps } from '../type'
import { useScrollHints } from '../hooks/use-scroll-hints'
import { useSeatHighlightAnimation } from '../hooks/use-seat-highlight-animation'
import type { PresenceStatus } from '@/types'

// 列幅は固定 180px。ブラウザ幅次第でオーバーフロー量が変わるため、ヒントは実測で出す

type Props = SeatGridProps

export const DesktopSeatGrid = ({
  grid,
  employeeById,
  presenceMap,
  teamName,
  teamColor,
  loading,
  highlightSeatId,
  onSeatClick,
  onClearHighlight,
}: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { hasOverflow, atStart, atEnd } = useScrollHints(scrollRef, grid.cols)
  // 列幅180px固定なので、ブラウザ幅が狭いとヒット席が横スクロールの外に出る。
  // 実測: 幅900pxで 492px、幅800pxで 592px あふれ、scrollLeft は 0 のままだった。
  // Compact と同じフックで追従させる(戻り値の glowing は Desktop カードが
  // 枠+リング+影+HITバッジを既に持つため使わない)
  useSeatHighlightAnimation(scrollRef, highlightSeatId)
  const spotlight = highlightSeatId !== null

  const cells = []
  // seatByGridCell を row×col で全走査する。座席の無いセルは閲覧中なら描かない
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const seat = grid.seatByGridCell.get(gridCellKey(row, col))
      if (!seat) continue
      const employee = seat.employeeId ? employeeById.get(seat.employeeId) ?? null : null
      const status: PresenceStatus = employee ? presenceMap.get(employee.id) ?? 'present' : 'present'
      const isHit = highlightSeatId === seat.id
      const dimmed = spotlight && !isHit
      cells.push(
        <div key={seat.id} style={{ gridRow: row + 1, gridColumn: col + 1, display: 'flex' }}>
          <SeatCard
            seat={seat}
            employee={employee}
            status={status}
            teamName={teamName}
            teamColor={teamColor}
            loading={loading}
            isHit={isHit}
            dimmed={dimmed}
            onSelect={() => {
              if (!employee) return
              if (dimmed) {
                onClearHighlight?.()
                return
              }
              onSeatClick(seat.id)
            }}
          />
        </div>
      )
    }
  }

  return (
    <div className='team-ovl-gridwrap'>
      <div ref={scrollRef} className={`team-ovl-grid is-desktop${loading ? ' is-loading' : ''}`} aria-busy={loading}>
        <div
          className='team-ovl-grid-inner'
          style={{
            gridTemplateColumns: `repeat(${grid.cols}, ${DESKTOP_SEAT_CARD_WIDTH_PX}px)`,
            gap: DESKTOP_SEAT_GAP_PX,
            width: 'fit-content',
            margin: '0 auto',
          }}
        >
          {cells}
        </div>
      </div>
      {/* onNudge を渡さない = 表示のみのヒント */}
      {hasOverflow && !atStart && <ScrollHint side='left' />}
      {hasOverflow && !atEnd && <ScrollHint side='right' />}
    </div>
  )
}
