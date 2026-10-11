import { useCallback } from 'react'
import type { CanvasViewModel } from './use-canvas-view-model'
import type { EditDragState } from './use-edit-drag'

// キャンバスへの選択の入力(余白クリック・ミラー層の座席選択)を、編集モードかどうかで行き先を振り分ける

type SelectionRouting = {
  handleBackgroundClick: () => void
  handleMirrorSelect: (seatId: string, toggle: boolean) => void
}

export const useSelectionRouting = (
  isEditMode: boolean,
  edit: Pick<EditDragState, 'clearSelection' | 'selectSeat'>,
  view: Pick<CanvasViewModel, 'handleSeatSelect'>
): SelectionRouting => {
  // 07: 空き領域クリックで座席の編集選択を解除(各要素側は stopPropagation 済み)
  const handleBackgroundClick = useCallback(() => {
    if (isEditMode) edit.clearSelection()
  }, [isEditMode, edit])

  // 05-3: 編集セッション中の座席選択はミラーボタンが唯一の入口。閲覧モードは従来どおり詳細を開く
  const handleMirrorSelect = useCallback(
    (seatId: string, toggle: boolean) => {
      if (isEditMode) edit.selectSeat(seatId, toggle)
      else view.handleSeatSelect(seatId)
    },
    [isEditMode, edit, view]
  )

  return { handleBackgroundClick, handleMirrorSelect }
}
