import { useRef } from 'react'
import { EditSeatCell } from './EditSeatCell'
import { EmptyGridCell } from './EmptyGridCell'
import { GRID_HEADER_TRACK_PX, GridEdgeAddButtons, GridRemoveHeaders } from './GridEdgeControls'
import { useGridEdgeInsert } from '../hooks/use-grid-edge-insert'
import { ScrollHint } from './ScrollHint'
import { SeatActionOverlay } from './SeatActionOverlay'
import { SeatCard } from './SeatCard'
import { DESKTOP_SEAT_CARD_WIDTH_PX, DESKTOP_SEAT_GAP_PX, gridCellKey } from '../utils/seat-grid'
import { formatSeatGridCellAttr } from '../utils/seat-drag-attrs'
import type { SeatGridProps } from '../type'
import { useScrollHints } from '../hooks/use-scroll-hints'
import { useSeatHighlightAnimation } from '../hooks/use-seat-highlight-animation'
import type { UseSeatDragResult } from '../hooks/use-seat-drag'
import styles from '../team-overlay-modal.module.css'
import type { PresenceStatus } from '@/types'

// 列幅は固定 180px。ブラウザ幅次第でオーバーフロー量が変わるため、ヒントは実測で出す

type Props = SeatGridProps & {
  // §06-2: ドロップ先ハイライト用。use-seat-drag(担当内)が計算するhoverCellをそのまま受け取る。
  // SeatGridProps(../type.ts)にはまだフィールドが無く、そちらの追加は担当外(呼び出し側の配線も
  // 含め報告に記載)。optionalにして、現状の呼び出し側(SeatGridFrame/TeamOverlay/index.tsx)が
  // 渡さなくても型エラーにならないようにしてある
  hoverCell?: UseSeatDragResult['hoverCell']
}

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
  const { hasOverflow, atStart, atEnd } = useScrollHints(scrollRef, grid.cols)
  // 列幅180px固定なので、ブラウザ幅が狭いとヒット席が横スクロールの外に出る。
  // 実測: 幅900pxで 492px、幅800pxで 592px あふれ、scrollLeft は 0 のままだった。
  // Compact と同じフックで追従させる(戻り値の glowing は Desktop カードが
  // 枠+リング+影+HITバッジを既に持つため使わない)
  useSeatHighlightAnimation(scrollRef, highlightSeatId)
  const spotlight = highlightSeatId !== null

  // 編集中はヘッダー行・列トラック(GRID_HEADER_TRACK_PX)を1本ずつ足すため、既存セルは+1オフセットする
  const hasGridEdgeControls = isEditMode && editGrid !== null
  const rowOffset = hasGridEdgeControls ? 1 : 0
  const colOffset = hasGridEdgeControls ? 1 : 0

  // §06-2: 0席チームは1×1グリッドで生成される(createInitialGrid、担当外)。その1マスだけ
  // 「最初の席を追加」に文言を変える
  const isFirstSeatGrid = grid.rows === 1 && grid.cols === 1 && grid.positionedSeats.length === 0

  // 足した帯までスクロールし、短く点灯させる
  const { notifyInsert, isInsertedCell } = useGridEdgeInsert(scrollRef)
  const handleAddRow = (edge: 'top' | 'bottom') => {
    onAddRow(edge)
    notifyInsert(edge)
  }
  const handleAddCol = (edge: 'left' | 'right') => {
    onAddCol(edge)
    notifyInsert(edge)
  }

  // ヒントのタップで 1 列ぶんだけ滑らかに送る
  const nudge = (direction: -1 | 1) => {
    scrollRef.current?.scrollBy({
      left: direction * (DESKTOP_SEAT_CARD_WIDTH_PX + DESKTOP_SEAT_GAP_PX),
      behavior: 'smooth',
    })
  }

  const cells = []
  // seatByGridCell を row×col で全走査する。座席の無いセルは閲覧中なら描かず、編集中は空セルを描く
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const seat = grid.seatByGridCell.get(gridCellKey(row, col))
      if (!seat) {
        if (!isEditMode) continue
        // ループ変数(row/col)をそのまま閉じ込めるとイテレーションを跨いだ書き換えとみなされるため、
        // このセル分だけの不変な束縛(cell)を作ってから閉じる
        const cell = { row, col }
        const isDropTarget = isEditMode && hoverCell !== null && hoverCell.row === row && hoverCell.col === col
        cells.push(
          <div
            key={`empty-${row}-${col}`}
            className={`${isDropTarget ? styles.dropTarget : ''}${
              isInsertedCell(row, col, grid.rows, grid.cols) ? ` ${styles.isInserted}` : ''
            }`.trim() || undefined}
            style={{
              gridRow: row + 1 + rowOffset,
              gridColumn: col + 1 + colOffset,
              display: 'flex',
            }}
            data-seat-grid-cell={formatSeatGridCellAttr(cell)}
            {...cellMouseDropProps}
          >
            {/* §06-2: 空セルタップ=即追加(1段階)。選択→ピルタップの中間状態は経由しない */}
            <EmptyGridCell variant={isFirstSeatGrid ? 'firstSeat' : 'default'} onAdd={() => onAddSeat(cell)} />
          </div>
        )
        continue
      }
      const employee = seat.employeeId ? employeeById.get(seat.employeeId) ?? null : null
      const status: PresenceStatus = employee ? presenceMap.get(employee.id) ?? 'present' : 'present'
      const isHit = highlightSeatId === seat.id
      const dimmed = spotlight && !isHit
      const isDropTarget = isEditMode && hoverCell !== null && hoverCell.row === row && hoverCell.col === col
      cells.push(
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
              isCompact={false}
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
          )}
          {/* STEP C1: 選択中の席にだけ操作ピルを重ねる。空席/在席でラベルが変わる */}
          {isEditMode && isSeatSelected(seat.id) && (
            <SeatActionOverlay variant='seat' hasEmployee={employee !== null} onAssign={() => onAssignSeat(seat.id)} />
          )}
        </div>
      )
    }
  }

  // STEP B4: 空行・空列のヘッダにだけ出す削除ボタン(ヘッダー行・列トラックの分は上でオフセット済み)
  if (hasGridEdgeControls && editGrid) {
    cells.push(
      <GridRemoveHeaders
        key='grid-edge-remove-headers'
        grid={editGrid}
        onRemoveRow={onRemoveRow}
        onRemoveCol={onRemoveCol}
      />
    )
  }

  return (
    <div className={`${styles.gridwrap}${isEditMode ? ` ${styles.hasEdgeAdd}` : ''}`}>
      <div ref={scrollRef} className={`${styles.grid} ${styles.isDesktop}${loading ? ` ${styles.isLoading}` : ''}`} aria-busy={loading}>
        <div
          className={styles.gridInner}
          style={{
            gridTemplateColumns: hasGridEdgeControls
              ? `${GRID_HEADER_TRACK_PX}px repeat(${grid.cols}, ${DESKTOP_SEAT_CARD_WIDTH_PX}px)`
              : `repeat(${grid.cols}, ${DESKTOP_SEAT_CARD_WIDTH_PX}px)`,
            gridTemplateRows: hasGridEdgeControls ? `${GRID_HEADER_TRACK_PX}px` : undefined,
            gap: DESKTOP_SEAT_GAP_PX,
            width: 'fit-content',
            margin: '0 auto',
          }}
        >
          {cells}
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
