import { useCallback, useEffect, useRef, useState } from 'react'
import type { DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent } from 'react'
import { safeSetPointerCapture } from '@/lib/gesture/pointer-capture'
import { suppressGhostClick } from '@/lib/gesture/suppress-ghost-click'
import type { GridCell } from '@/utils/seat-grid-draft'

// STEP B2: チームオーバーレイの座席編集 — ドラッグ移動/入替
//
// マウスとタッチは別経路にする(マウス: HTML5 DnD、タッチ: Pointer + 長押し)。
// 1本にまとめると iOS で DnD が発火しない・Android でスクロールを奪えない、の両方に当たる。
//
// グリッドの実セルDOMは別STEPが描く前提のため、このフックはセルの位置を data 属性
// (SEAT_GRID_CELL_ATTR)経由でDOMから直接読み取る。呼び出し側は各セルのラッパー要素へ
// `data-seat-grid-cell={formatSeatGridCellAttr(cell)}` を付け、席が置かれたセルには
// 既存のサイト共通規約(`data-seat-id`, ViewSeatCell/SeatCard と同じ)をそのまま付ければ、
// このフックが返す props を spread するだけでドラッグ/ドロップが成立する

// タッチ: 長押しでドラッグ開始とみなすまでの時間(ms)
export const TOUCH_LONG_PRESS_MS = 220
// タッチ: 開始前にこれ以上動いたらスクロール優先でキャンセルする距離(px)
export const TOUCH_DRAG_TOLERANCE_PX = 10

// セル番地(row:col)を伝える data 属性名。実セルのDOMは別STEPが描く
export const SEAT_GRID_CELL_ATTR = 'data-seat-grid-cell'

// セル番地を data 属性値へ直列化する。セルDOMを描く側がこれを使って属性を付与する
export const formatSeatGridCellAttr = (cell: GridCell): string => `${cell.row}:${cell.col}`

const parseSeatGridCellAttr = (value: string | undefined): GridCell | null => {
  if (!value) return null
  const [rowText, colText] = value.split(':')
  const row = Number(rowText)
  const col = Number(colText)
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null
  return { row, col }
}

// 任意の子要素から祖先を遡ってセル番地を解決する(pointermove/dragover/elementFromPointの結果に使う)
const resolveCellFromElement = (el: Element | null): GridCell | null => {
  const cellEl = el?.closest<HTMLElement>(`[${SEAT_GRID_CELL_ATTR}]`)
  return parseSeatGridCellAttr(cellEl?.dataset.seatGridCell)
}

// 座席idは既存のサイト共通規約(`data-seat-id`)から読む。同じ概念の判定基準をここで作らない
const resolveSeatIdFromElement = (el: Element | null): string | null => {
  const seatEl = el?.closest<HTMLElement>('[data-seat-id]')
  return seatEl?.dataset.seatId ?? null
}

// タッチ側の内部状態機械。pending(長押し待ち)→dragging(確定)の一方向遷移
type TouchDragState =
  | { kind: 'idle' }
  | { kind: 'pending'; pointerId: number; cell: GridCell; startX: number; startY: number }
  | { kind: 'dragging'; pointerId: number; cell: GridCell }

export type SeatDragGhostPosition = { x: number; y: number }

export type UseSeatDragOptions = {
  // 入替/移動の確定口。moveSeatが空セルなら移動・席セルなら入替を1本で賄う
  moveSeat: (from: GridCell, to: GridCell) => void
}

export type UseSeatDragResult = {
  // 今ドラッグ中の元セル
  draggingCell: GridCell | null
  // 今ポインタ/カーソルが乗っているセル(ドロップ先の見た目用)
  hoverCell: GridCell | null
  // タッチドラッグ中だけ非null。指に追従させるゴーストの現在位置(SeatDragGhostへ渡す)
  touchGhostPosition: SeatDragGhostPosition | null
  // マウス経路: draggableにする席要素へ spread する
  seatMouseDragProps: {
    draggable: true
    onDragStart: (e: ReactDragEvent<HTMLElement>) => void
    onDragEnd: (e: ReactDragEvent<HTMLElement>) => void
  }
  // マウス経路: ドロップを受け付ける側へ spread する(セル単位・グリッドコンテナへの委譲どちらでも可。
  // 内部でDOMのdata属性からセルを解決するためReactのclosureに依存しない)
  cellMouseDropProps: {
    onDragOver: (e: ReactDragEvent<HTMLElement>) => void
    onDrop: (e: ReactDragEvent<HTMLElement>) => void
  }
  // タッチ経路: 席要素へ spread する
  seatTouchProps: {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void
    onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void
  }
}

export const useSeatDrag = ({ moveSeat }: UseSeatDragOptions): UseSeatDragResult => {
  const [draggingCell, setDraggingCell] = useState<GridCell | null>(null)
  const [hoverCell, setHoverCell] = useState<GridCell | null>(null)
  const [touchGhostPosition, setTouchGhostPosition] = useState<SeatDragGhostPosition | null>(null)

  const dragStateRef = useRef<TouchDragState>({ kind: 'idle' })
  const longPressTimerRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const latestPointRef = useRef<SeatDragGhostPosition | null>(null)
  const touchMoveAttachedRef = useRef(false)

  // touch-actionはジェスチャ開始時点で評価され途中で変えても効かないため、確定後は
  // documentへ非パッシブ touchmove を張って preventDefault でスクロールを止める。
  // 毎pointermoveで叩くと落ちるためrAFで間引く
  const handleDocumentTouchMove = useCallback((e: TouchEvent) => {
    if (dragStateRef.current.kind !== 'dragging') return
    e.preventDefault()
    const touch = e.touches[0]
    if (!touch) return
    latestPointRef.current = { x: touch.clientX, y: touch.clientY }
    if (rafRef.current !== null) return
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null
      const point = latestPointRef.current
      if (!point || dragStateRef.current.kind !== 'dragging') return
      setHoverCell(resolveCellFromElement(document.elementFromPoint(point.x, point.y)))
      setTouchGhostPosition(point)
    })
  }, [])

  const detachTouchMove = useCallback(() => {
    if (!touchMoveAttachedRef.current) return
    document.removeEventListener('touchmove', handleDocumentTouchMove)
    touchMoveAttachedRef.current = false
  }, [handleDocumentTouchMove])

  const resetTouchDrag = useCallback(() => {
    detachTouchMove()
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    latestPointRef.current = null
    dragStateRef.current = { kind: 'idle' }
    setDraggingCell(null)
    setHoverCell(null)
    setTouchGhostPosition(null)
  }, [detachTouchMove])

  // アンマウント時の保険。ドラッグ中に離脱してもdocumentリスナを必ず外す
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) window.clearTimeout(longPressTimerRef.current)
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current)
      detachTouchMove()
    }
  }, [detachTouchMove])

  // --- マウス経路(HTML5 DnD) ---

  const handleSeatDragStart = useCallback((e: ReactDragEvent<HTMLElement>) => {
    const cell = resolveCellFromElement(e.currentTarget)
    const seatId = resolveSeatIdFromElement(e.currentTarget)
    if (!cell || !seatId) {
      e.preventDefault()
      return
    }
    e.dataTransfer.setData('text/plain', seatId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingCell(cell)
  }, [])

  const handleSeatDragEnd = useCallback(() => {
    setDraggingCell(null)
    setHoverCell(null)
  }, [])

  const handleCellDragOver = useCallback((e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault()
    setHoverCell(resolveCellFromElement(e.target as Element))
  }, [])

  const handleCellDrop = useCallback(
    (e: ReactDragEvent<HTMLElement>) => {
      e.preventDefault()
      const toCell = resolveCellFromElement(e.target as Element)
      const fromCell = draggingCell
      setDraggingCell(null)
      setHoverCell(null)
      if (fromCell && toCell) moveSeat(fromCell, toCell)
    },
    [draggingCell, moveSeat]
  )

  // --- タッチ経路(Pointer + 長押し) ---

  const handleSeatPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (e.pointerType !== 'touch') return
      const cell = resolveCellFromElement(e.currentTarget)
      if (!cell) return
      safeSetPointerCapture(e.currentTarget, e.pointerId)
      dragStateRef.current = { kind: 'pending', pointerId: e.pointerId, cell, startX: e.clientX, startY: e.clientY }
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTimerRef.current = null
        const pending = dragStateRef.current
        if (pending.kind !== 'pending' || pending.pointerId !== e.pointerId) return
        dragStateRef.current = { kind: 'dragging', pointerId: pending.pointerId, cell: pending.cell }
        setDraggingCell(pending.cell)
        const point = { x: pending.startX, y: pending.startY }
        latestPointRef.current = point
        setTouchGhostPosition(point)
        document.addEventListener('touchmove', handleDocumentTouchMove, { passive: false })
        touchMoveAttachedRef.current = true
      }, TOUCH_LONG_PRESS_MS)
    },
    [handleDocumentTouchMove]
  )

  const handleSeatPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const state = dragStateRef.current
    if (state.kind !== 'pending' || state.pointerId !== e.pointerId) return
    const dx = e.clientX - state.startX
    const dy = e.clientY - state.startY
    if (Math.hypot(dx, dy) <= TOUCH_DRAG_TOLERANCE_PX) return
    // 閾値超えはスクロール優先。長押しをキャンセルする
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    dragStateRef.current = { kind: 'idle' }
  }, [])

  const handleSeatPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const state = dragStateRef.current
      if (state.kind === 'idle' || state.pointerId !== e.pointerId) return
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
      if (state.kind === 'dragging') {
        const point = latestPointRef.current ?? { x: e.clientX, y: e.clientY }
        const toCell = resolveCellFromElement(document.elementFromPoint(point.x, point.y))
        if (toCell) moveSeat(state.cell, toCell)
        // ドロップ直後の合成clickがそのまま席選択にならないよう抑止する
        suppressGhostClick()
      }
      resetTouchDrag()
    },
    [moveSeat, resetTouchDrag]
  )

  const handleSeatPointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const state = dragStateRef.current
      if (state.kind === 'idle' || state.pointerId !== e.pointerId) return
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
      resetTouchDrag()
    },
    [resetTouchDrag]
  )

  return {
    draggingCell,
    hoverCell,
    touchGhostPosition,
    seatMouseDragProps: {
      draggable: true,
      onDragStart: handleSeatDragStart,
      onDragEnd: handleSeatDragEnd,
    },
    cellMouseDropProps: {
      onDragOver: handleCellDragOver,
      onDrop: handleCellDrop,
    },
    seatTouchProps: {
      onPointerDown: handleSeatPointerDown,
      onPointerMove: handleSeatPointerMove,
      onPointerUp: handleSeatPointerUp,
      onPointerCancel: handleSeatPointerCancel,
    },
  }
}
