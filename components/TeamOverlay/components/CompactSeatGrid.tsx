import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { EditSeatCell } from './EditSeatCell'
import { EmptyGridCell } from './EmptyGridCell'
import { GRID_HEADER_TRACK_PX, GridEdgeAddButtons, GridRemoveHeaders } from './GridEdgeControls'
import { ScrollHint } from './ScrollHint'
import { SeatActionOverlay } from './SeatActionOverlay'
import { ViewSeatCell } from './ViewSeatCell'
import {
  COMPACT_SEAT_GAP_PX,
  COMPACT_SEAT_MIN_HEIGHT_PX,
  COMPACT_SIDE_PADDING_PX,
  COMPACT_VISIBLE_COLS,
} from '../utils/seat-grid'
import type { SeatGridProps } from '../type'
import { useScrollActivity } from '../hooks/use-scroll-activity'
import { useScrollHints } from '../hooks/use-scroll-hints'
import { formatSeatGridCellAttr } from '../hooks/use-seat-drag'
import { useSeatHighlightAnimation } from '../hooks/use-seat-highlight-animation'
import type { PresenceStatus } from '@/types'

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

// STEP B4: 列を左へ足すと新しい空列ぶん内容が右へ押し出され、見ていた場所が横へ飛ぶ。
// 左挿入の累計本数を持ち、増分ぶんだけ scrollLeft を足して視界を保つ
const useCompensateLeftInsert = (
  ref: RefObject<HTMLElement | null>,
  leftInsertCount: number,
  colStridePx: number
): void => {
  const compensatedRef = useRef(0)
  useLayoutEffect(() => {
    const el = ref.current
    const delta = leftInsertCount - compensatedRef.current
    if (!el || colStridePx <= 0 || delta <= 0) return
    el.scrollLeft += delta * colStridePx
    compensatedRef.current = leftInsertCount
  })
}

export const CompactSeatGrid = ({
  grid,
  employeeById,
  presenceMap,
  teamName,
  teamColor,
  loading,
  highlightSeatId,
  onSeatClick,
  onClearHighlight,
  isEditMode,
  isSeatSelected,
  isEmptyCellSelected,
  onSelectSeat,
  onSelectEmptyCell,
  seatMouseDragProps,
  cellMouseDropProps,
  seatTouchProps,
  editGrid,
  onAddRow,
  onAddCol,
  onRemoveRow,
  onRemoveCol,
  onAddSeat,
  onAssignSeat,
  onRotateSeat,
}: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const cellWidth = useCompactCellWidth(scrollRef)
  const { hasOverflow, atStart, atEnd } = useScrollHints(scrollRef, grid.cols)
  const isScrollingRef = useScrollActivity()
  const glowing = useSeatHighlightAnimation(scrollRef, highlightSeatId)
  const spotlight = highlightSeatId !== null

  // 編集中はヘッダー行・列トラック(GRID_HEADER_TRACK_PX)を1本ずつ足すため、既存セルは+1オフセットする
  const hasGridEdgeControls = isEditMode && editGrid !== null
  const rowOffset = hasGridEdgeControls ? 1 : 0
  const colOffset = hasGridEdgeControls ? 1 : 0

  // 左へ列を足した回数を数え、増分ぶんだけ scrollLeft を補正する。render中にref.currentを
  // 読まないよう、カウンタ自体はstateで持つ(コミット後の副作用はuseCompensateLeftInsert内のrefが担う)
  const [leftInsertCount, setLeftInsertCount] = useState(0)
  const handleAddCol = (edge: 'left' | 'right') => {
    if (edge === 'left') setLeftInsertCount((count) => count + 1)
    onAddCol(edge)
  }
  useCompensateLeftInsert(scrollRef, leftInsertCount, cellWidth + COMPACT_SEAT_GAP_PX)

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
            gridTemplateColumns: hasGridEdgeControls
              ? `${GRID_HEADER_TRACK_PX}px repeat(${grid.cols}, minmax(${cellWidth}px, 1fr))`
              : `repeat(${grid.cols}, minmax(${cellWidth}px, 1fr))`,
            gridTemplateRows: hasGridEdgeControls ? `${GRID_HEADER_TRACK_PX}px` : undefined,
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
              <div
                key={seat.id}
                style={{
                  gridRow: row + 1 + rowOffset,
                  gridColumn: col + 1 + colOffset,
                  display: 'flex',
                  // STEP C1: 選択中の席にSeatActionOverlay(ピル)を絶対配置するための起点(EmptyGridCellと同じ方針)
                  position: isEditMode ? 'relative' : undefined,
                }}
                data-seat-grid-cell={isEditMode ? formatSeatGridCellAttr({ row, col }) : undefined}
                {...(isEditMode ? cellMouseDropProps : {})}
              >
                {isEditMode ? (
                  <EditSeatCell
                    seat={seat}
                    employee={employee}
                    teamName={teamName}
                    teamColor={teamColor}
                    isSelected={isSeatSelected(seat.id)}
                    onSelect={() => onSelectSeat(seat.id)}
                    seatMouseDragProps={seatMouseDragProps}
                    seatTouchProps={seatTouchProps}
                    onRotateSeat={onRotateSeat}
                  />
                ) : (
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
                )}
                {/* STEP C1: 選択中の席にだけ操作ピルを重ねる。空席/在席でラベルが変わる */}
                {isEditMode && isSeatSelected(seat.id) && (
                  <SeatActionOverlay variant='seat' hasEmployee={employee !== null} onAssign={() => onAssignSeat(seat.id)} />
                )}
              </div>
            )
          })}
          {/* 空セルは編集中だけ埋まる(use-seat-layout-compose 参照)。表示モードでは常に空配列 */}
          {isEditMode &&
            (grid.emptyCells ?? []).map((cell) => (
              <div
                key={`empty-${cell.row}-${cell.col}`}
                style={{
                  gridRow: cell.row + 1 + rowOffset,
                  gridColumn: cell.col + 1 + colOffset,
                  display: 'flex',
                  // STEP B5: SeatActionOverlay(pill)をこのセル基準で絶対配置するための起点
                  position: 'relative',
                }}
                data-seat-grid-cell={formatSeatGridCellAttr(cell)}
                {...cellMouseDropProps}
              >
                <EmptyGridCell isSelected={isEmptyCellSelected(cell)} onSelect={() => onSelectEmptyCell(cell)} />
                {/* STEP B5: 選択中のセルにだけ「席追加」ピルを重ねる */}
                {isEmptyCellSelected(cell) && (
                  <SeatActionOverlay variant='emptyCell' onAddSeat={() => onAddSeat(cell)} />
                )}
              </div>
            ))}
          {/* STEP B4: 空行・空列のヘッダにだけ出す削除ボタン(ヘッダー行・列トラックの分は上でオフセット済み) */}
          {hasGridEdgeControls && editGrid && (
            <GridRemoveHeaders grid={editGrid} onRemoveRow={onRemoveRow} onRemoveCol={onRemoveCol} />
          )}
        </div>
      </div>
      {/* onNudge を渡す = ボタン化。端に達した側は is-faded でフェード(アンマウントはしない) */}
      {hasOverflow && <ScrollHint side='left' onNudge={() => nudge(-1)} faded={atStart} />}
      {hasOverflow && <ScrollHint side='right' onNudge={() => nudge(1)} faded={atEnd} />}
      {/* STEP B4: グリッド4辺の＋ボタン。編集中のみ */}
      {isEditMode && <GridEdgeAddButtons onAddRow={onAddRow} onAddCol={handleAddCol} />}
    </div>
  )
}
