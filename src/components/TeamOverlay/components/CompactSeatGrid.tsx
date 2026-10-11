import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { EditSeatCell } from './EditSeatCell'
import { EmptyGridCell } from './EmptyGridCell'
import { GRID_HEADER_TRACK_PX, GridEdgeAddButtons, GridRemoveHeaders, hasRemovableBand } from './GridEdgeControls'
import { ScrollHint } from './ScrollHint'
import { SeatActionOverlay } from './SeatActionOverlay'
import { ViewSeatCell } from './ViewSeatCell'
import {
  COMPACT_SEAT_GAP_PX,
  COMPACT_SEAT_MIN_HEIGHT_PX,
  COMPACT_SIDE_PADDING_PX,
  COMPACT_VISIBLE_COLS,
} from '../utils/seat-grid'
import { formatSeatGridCellAttr } from '../utils/seat-drag-attrs'
import type { SeatGridProps } from '../type'
import { useGridEdgeInsert } from '../hooks/use-grid-edge-insert'
import { useScrollActivity } from '../hooks/use-scroll-activity'
import { useScrollHints } from '../hooks/use-scroll-hints'
import { useSeatHighlightAnimation } from '../hooks/use-seat-highlight-animation'
import type { UseSeatDragResult } from '../hooks/use-seat-drag'
import styles from '../team-overlay-modal.module.css'
import type { PresenceStatus } from '@/types'

// 列幅は可変。6 列がコンテナ幅にちょうど収まる幅を実測して minmax の下限に使う

type Props = SeatGridProps & {
  // §06-2: ドロップ先ハイライト用。use-seat-drag(担当内)が計算するhoverCellをそのまま受け取る。
  // SeatGridProps(../type.ts)にはまだフィールドが無く、そちらの追加は担当外(呼び出し側の配線も
  // 含め報告に記載)。optionalにして、現状の呼び出し側(SeatGridFrame/TeamOverlay/index.tsx)が
  // 渡さなくても型エラーにならないようにしてある
  hoverCell?: UseSeatDragResult['hoverCell']
}

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
  teamColor,
  loading,
  highlightSeatId,
  onSeatClick,
  onClearHighlight,
  isEditMode,
  isSeatSelected,
  onSelectSeat,
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
  hoverCell = null,
}: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const cellWidth = useCompactCellWidth(scrollRef)
  const { hasOverflow, atStart, atEnd } = useScrollHints(scrollRef, grid.cols)
  const isScrollingRef = useScrollActivity()
  const glowing = useSeatHighlightAnimation(scrollRef, highlightSeatId)
  const spotlight = highlightSeatId !== null

  // 編集中はヘッダー行・列トラック(GRID_HEADER_TRACK_PX)を1本ずつ足すため、既存セルは+1オフセットする
  // 空き行・列が無い間はヘッダートラックを作らない(ボタンの出ない空帯で座席が押し出されるため)
  const hasGridEdgeControls = isEditMode && editGrid !== null && hasRemovableBand(editGrid)
  const rowOffset = hasGridEdgeControls ? 1 : 0
  const colOffset = hasGridEdgeControls ? 1 : 0

  // §06-2: 0席チームは1×1グリッドで生成される(createInitialGrid、担当外)。その1マスだけ
  // 「最初の席を追加」に文言を変える
  const isFirstSeatGrid = grid.rows === 1 && grid.cols === 1 && grid.positionedSeats.length === 0

  // 足した帯までスクロールし、短く点灯させる。
  // 以前は左挿入で視界を保つ補正(use-compensate-left-insert)を入れていたが、
  // 「足した列まで移動する」方針にしたので不要になった。両方あると補正が滑らかな移動を打ち消す
  const { notifyInsert, isInsertedCell } = useGridEdgeInsert(scrollRef)
  const handleAddCol = (edge: 'left' | 'right') => {
    onAddCol(edge)
    notifyInsert(edge)
  }
  const handleAddRow = (edge: 'top' | 'bottom') => {
    onAddRow(edge)
    notifyInsert(edge)
  }

  // ヒントのタップで 1 列ぶんだけ滑らかに送る
  const nudge = (direction: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: direction * (cellWidth + COMPACT_SEAT_GAP_PX), behavior: 'smooth' })
  }

  return (
    <div className={`${styles.gridwrap}${isEditMode ? ` ${styles.hasEdgeAdd}` : ''}`}>
      <div ref={scrollRef} className={`${styles.grid} ${styles.isCompact}${loading ? ` ${styles.isLoading}` : ''}`} aria-busy={loading}>
        <div
          className={styles.gridInner}
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
            const isDropTarget = isEditMode && hoverCell !== null && hoverCell.row === row && hoverCell.col === col
            return (
              <div
                key={seat.id}
                className={`${isDropTarget ? styles.dropTarget : ''}${
                  isInsertedCell(row, col, grid.rows, grid.cols) ? ` ${styles.isInserted}` : ''
                }`.trim() || undefined}
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
                    isCompact
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
            (grid.emptyCells ?? []).map((cell) => {
              const isDropTarget = hoverCell !== null && hoverCell.row === cell.row && hoverCell.col === cell.col
              return (
                <div
                  key={`empty-${cell.row}-${cell.col}`}
                  className={`${isDropTarget ? styles.dropTarget : ''}${
                    isInsertedCell(cell.row, cell.col, grid.rows, grid.cols) ? ` ${styles.isInserted}` : ''
                  }`.trim() || undefined}
                  style={{
                    gridRow: cell.row + 1 + rowOffset,
                    gridColumn: cell.col + 1 + colOffset,
                    display: 'flex',
                  }}
                  data-seat-grid-cell={formatSeatGridCellAttr(cell)}
                  {...cellMouseDropProps}
                >
                  {/* §06-2: 空セルタップ=即追加(1段階)。選択→ピルタップの中間状態は経由しない */}
                  <EmptyGridCell variant={isFirstSeatGrid ? 'firstSeat' : 'default'} onAdd={() => onAddSeat(cell)} />
                </div>
              )
            })}
          {/* STEP B4: 空行・空列のヘッダにだけ出す削除ボタン(ヘッダー行・列トラックの分は上でオフセット済み) */}
          {hasGridEdgeControls && editGrid && (
            <GridRemoveHeaders grid={editGrid} onRemoveRow={onRemoveRow} onRemoveCol={onRemoveCol} />
          )}
        </div>
      </div>
      {/* onNudge を渡す = ボタン化。端に達した側は isFaded でフェード(アンマウントはしない) */}
      {hasOverflow && <ScrollHint side='left' onNudge={() => nudge(-1)} faded={atStart} />}
      {hasOverflow && <ScrollHint side='right' onNudge={() => nudge(1)} faded={atEnd} />}
      {/* STEP B4: グリッド4辺の＋ボタン。編集中のみ */}
      {isEditMode && <GridEdgeAddButtons onAddRow={handleAddRow} onAddCol={handleAddCol} />}
    </div>
  )
}
