import type { EditDragState } from '../hooks/use-edit-drag'
import type { SeatMapCanvasProps } from '../type'
import { UndoChip } from '@/components/edit/UndoChip'

// 「元に戻す」チップを出すかどうかと、押したときの取り消し・チップの片付け

type Props = Pick<SeatMapCanvasProps, 'canUndo' | 'onUndo'> & {
  isEditMode: boolean
  edit: Pick<EditDragState, 'undoChip'>
}

export const CanvasUndoChip = ({ isEditMode, edit, canUndo, onUndo }: Props) => (
  <>
    {isEditMode && edit.undoChip.view && canUndo && (
      <UndoChip
        x={edit.undoChip.view.chip.x}
        y={edit.undoChip.view.chip.y}
        message={edit.undoChip.message}
        frame={edit.undoChip.view.frame}
        onUndo={() => {
          onUndo?.()
          edit.undoChip.dismiss()
        }}
      />
    )}
  </>
)
