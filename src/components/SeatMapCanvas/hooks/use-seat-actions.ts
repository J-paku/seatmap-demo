import { useCallback, useMemo } from 'react'
import type { EditDragState } from './use-edit-drag'
import { isSingleSeatOccupied } from '../utils/detect-single-occupied'
import type { Employee, SeatLayout } from '@/types'

// 座席一括操作バー(SeatActionBar)の材料。単独選択の着席判定と、削除の行き先の振り分け

type Options = {
  edit: Pick<EditDragState, 'editSelectedSeatIds'>
  layout: Pick<SeatLayout, 'seats'>
  employeeById: Map<string, Employee>
  onSeatDeleteRequest?: (seatId: string) => void
  onSeatBulkDeleteRequest?: (seatIds: string[]) => void
}

type SeatActions = {
  isSelectedSeatOccupied: boolean
  handleSeatDelete: () => void
}

export const useSeatActions = ({
  edit,
  layout,
  employeeById,
  onSeatDeleteRequest,
  onSeatBulkDeleteRequest,
}: Options): SeatActions => {
  // 05-4: 単独選択のときだけ「配属/変更」が分かれる。着席判定は seat-occupancy に一本化する
  const isSelectedSeatOccupied = useMemo(
    () => isSingleSeatOccupied(edit.editSelectedSeatIds, layout.seats, employeeById),
    [edit.editSelectedSeatIds, layout.seats, employeeById]
  )

  // 1席は既存の確認ダイアログへ、2席以上は件数ごと一括削除確認へ渡す(文言は仕様 07-2・別担当)
  const handleSeatDelete = useCallback(() => {
    const ids = edit.editSelectedSeatIds
    if (ids.length === 0) return
    if (ids.length === 1) onSeatDeleteRequest?.(ids[0])
    else onSeatBulkDeleteRequest?.(ids)
  }, [edit.editSelectedSeatIds, onSeatDeleteRequest, onSeatBulkDeleteRequest])

  return { isSelectedSeatOccupied, handleSeatDelete }
}
