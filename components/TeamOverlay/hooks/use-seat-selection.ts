import { useCallback, useEffect, useState } from 'react'
import type { GridCell } from '@/utils/layout/seat-grid-draft'

// STEP B1: 編集中セルの選択状態。席1件・空セル1件のどちらか一方だけを持つ単一選択で、
// 種別をまたいでも常に1件までしか保持しない(席を選ぶと空セルの選択は自動的に外れる)

type SeatSelection = { kind: 'seat'; seatId: string } | { kind: 'empty'; row: number; col: number } | null

export type UseSeatSelectionResult = {
  selection: SeatSelection
  selectSeat: (seatId: string) => void
  selectEmptyCell: (cell: GridCell) => void
  clearSelection: () => void
  isSeatSelected: (seatId: string) => boolean
  isEmptyCellSelected: (cell: GridCell) => boolean
}

export const useSeatSelection = (isEditMode: boolean): UseSeatSelectionResult => {
  const [selection, setSelection] = useState<SeatSelection>(null)

  // 編集モードを抜けたら選択も消す。表示モードへ選択状態を持ち越さない
  useEffect(() => {
    // isEditMode の変化そのものをきっかけに選択を打ち切る一時的な後始末であり、派生値ではない
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isEditMode) setSelection(null)
  }, [isEditMode])

  const selectSeat = useCallback((seatId: string) => {
    setSelection({ kind: 'seat', seatId })
  }, [])

  const selectEmptyCell = useCallback((cell: GridCell) => {
    setSelection({ kind: 'empty', row: cell.row, col: cell.col })
  }, [])

  const clearSelection = useCallback(() => setSelection(null), [])

  const isSeatSelected = useCallback(
    (seatId: string) => selection?.kind === 'seat' && selection.seatId === seatId,
    [selection]
  )

  const isEmptyCellSelected = useCallback(
    (cell: GridCell) => selection?.kind === 'empty' && selection.row === cell.row && selection.col === cell.col,
    [selection]
  )

  return { selection, selectSeat, selectEmptyCell, clearSelection, isSeatSelected, isEmptyCellSelected }
}
