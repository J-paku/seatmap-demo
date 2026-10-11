import { useSeatActions } from '../hooks/use-seat-actions'
import type { EditDragState } from '../hooks/use-edit-drag'
import type { SeatMapCanvasProps } from '../type'
import { SeatActionBar } from '@/components/edit/SeatActionBar'
import type { Employee, SeatLayout } from '@/types'

// 座席一括操作バー(SeatActionBar)を出すかどうかと、各ボタンの行き先

type Props = Pick<
  SeatMapCanvasProps,
  | 'onSeatAssignRequest'
  | 'onSeatRotateRequest'
  | 'onSeatShapeRequest'
  | 'onSeatDeleteRequest'
  | 'onSeatBulkDeleteRequest'
> & {
  isEditMode: boolean
  edit: Pick<EditDragState, 'editSelectedSeatIds' | 'clearSelection'>
  layout: Pick<SeatLayout, 'seats'>
  employeeById: Map<string, Employee>
}

export const SelectedSeatsBar = ({
  isEditMode,
  edit,
  layout,
  employeeById,
  onSeatAssignRequest,
  onSeatRotateRequest,
  onSeatShapeRequest,
  onSeatDeleteRequest,
  onSeatBulkDeleteRequest,
}: Props) => {
  const { isSelectedSeatOccupied, handleSeatDelete } = useSeatActions({
    edit,
    layout,
    employeeById,
    onSeatDeleteRequest,
    onSeatBulkDeleteRequest,
  })

  return (
    <>
      {isEditMode && edit.editSelectedSeatIds.length > 0 && (
        <SeatActionBar
          seatIds={edit.editSelectedSeatIds}
          isSelectedSeatOccupied={isSelectedSeatOccupied}
          onAssign={() => onSeatAssignRequest?.(edit.editSelectedSeatIds[0])}
          onRotate={() => onSeatRotateRequest?.(edit.editSelectedSeatIds)}
          onEnlarge={() => onSeatShapeRequest?.(edit.editSelectedSeatIds)}
          onDelete={handleSeatDelete}
          onClearSelection={edit.clearSelection}
        />
      )}
    </>
  )
}
