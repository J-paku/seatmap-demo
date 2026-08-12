import { useCallback, useEffect, useState } from 'react'

// STEP B1: 編集中セルの選択状態。席1件だけを持つ単一選択(§06-2の1段階化により空セルは
// タップ即追加になったため、空セル自体を「選択」する状態はもう存在しない)

type SeatSelection = { kind: 'seat'; seatId: string } | null

export type UseSeatSelectionResult = {
  selection: SeatSelection
  selectSeat: (seatId: string) => void
  clearSelection: () => void
  isSeatSelected: (seatId: string) => boolean
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

  const clearSelection = useCallback(() => setSelection(null), [])

  const isSeatSelected = useCallback(
    (seatId: string) => selection?.kind === 'seat' && selection.seatId === seatId,
    [selection]
  )

  return { selection, selectSeat, clearSelection, isSeatSelected }
}
