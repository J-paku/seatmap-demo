import { useCallback, useState } from 'react'
import { useSeatDraftState } from './use-seat-draft-state'
import type { SeatDraftState } from './use-seat-draft-state'
import {
  addCol,
  addRow,
  buildSeatGridDraft,
  clearSeat,
  createInitialGrid,
  moveSeat,
  placeSeat,
  removeCol,
  removeRow,
} from '@/utils/seat-grid-draft'
import type { GridCell, SeatGridDraft } from '@/utils/seat-grid-draft'
import { RELAYOUT_PADDING } from '@/utils/seat-relayout'
import type { Rect } from '@/utils/rect'
import type { Seat } from '@/types'

// STEP A3: 座席編集モードの出入口。入口(enterEditMode)と出口(cancel)をこのフック1本に集約する
//
// grid は enterEditMode 呼び出し時に buildSeatGridDraft を1回だけ走らせて作る。以降のグリッド操作は
// 全て「今持っている grid」に対する差分適用で、毎レンダーで作り直すことはしない
// (作り直すと編集中に足した行・列が消える)
//
// 割当・追加・削除・回転の下書き(draft)は use-seat-draft-state にそのまま委譲する。
// 二重に状態を持たないよう、この1インスタンスを唯一の draft ソースとして返す

export type UseOverlayEditModeResult = {
  isEditMode: boolean
  grid: SeatGridDraft | null
  // 編集開始。座標から grid を1回だけ起こす。席0件なら teamRect 左上+パディングへ1×1を作る
  enterEditMode: (seats: Seat[], teamRect: Rect) => void
  // draft と grid を破棄して表示モードへ戻る。確認は挟まない(取消は意図が明確な操作)
  cancel: () => void
  addRow: (edge: 'top' | 'bottom') => void
  addCol: (edge: 'left' | 'right') => void
  removeRow: (row: number) => void
  removeCol: (col: number) => void
  placeSeat: (cell: GridCell, seatId: string) => void
  clearSeat: (cell: GridCell) => void
  moveSeat: (from: GridCell, to: GridCell) => void
  draft: SeatDraftState
}

export const useOverlayEditMode = (): UseOverlayEditModeResult => {
  const draft = useSeatDraftState()
  const [isEditMode, setIsEditMode] = useState(false)
  const [grid, setGrid] = useState<SeatGridDraft | null>(null)

  const enterEditMode = useCallback((seats: Seat[], teamRect: Rect) => {
    const initial =
      buildSeatGridDraft(seats) ??
      createInitialGrid(teamRect.x + RELAYOUT_PADDING, teamRect.y + RELAYOUT_PADDING)
    setGrid(initial)
    setIsEditMode(true)
  }, [])

  const cancel = useCallback(() => {
    draft.clearDraft()
    setGrid(null)
    setIsEditMode(false)
  }, [draft])

  // grid が無い(未編集)間は何もしない共通ガード。呼び出し側に null 分岐を作らせない
  const updateGrid = useCallback((update: (current: SeatGridDraft) => SeatGridDraft) => {
    setGrid((prev) => (prev ? update(prev) : prev))
  }, [])

  const handleAddRow = useCallback((edge: 'top' | 'bottom') => updateGrid((g) => addRow(g, edge)), [updateGrid])
  const handleAddCol = useCallback((edge: 'left' | 'right') => updateGrid((g) => addCol(g, edge)), [updateGrid])
  const handleRemoveRow = useCallback((row: number) => updateGrid((g) => removeRow(g, row)), [updateGrid])
  const handleRemoveCol = useCallback((col: number) => updateGrid((g) => removeCol(g, col)), [updateGrid])
  const handlePlaceSeat = useCallback(
    (cell: GridCell, seatId: string) => updateGrid((g) => placeSeat(g, cell, seatId)),
    [updateGrid]
  )
  const handleClearSeat = useCallback((cell: GridCell) => updateGrid((g) => clearSeat(g, cell)), [updateGrid])
  const handleMoveSeat = useCallback(
    (from: GridCell, to: GridCell) => updateGrid((g) => moveSeat(g, from, to)),
    [updateGrid]
  )

  return {
    isEditMode,
    grid,
    enterEditMode,
    cancel,
    addRow: handleAddRow,
    addCol: handleAddCol,
    removeRow: handleRemoveRow,
    removeCol: handleRemoveCol,
    placeSeat: handlePlaceSeat,
    clearSeat: handleClearSeat,
    moveSeat: handleMoveSeat,
    draft,
  }
}
