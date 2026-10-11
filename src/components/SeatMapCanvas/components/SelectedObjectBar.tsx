import type { CanvasViewModel } from '../hooks/use-canvas-view-model'
import type { EditDragState } from '../hooks/use-edit-drag'
import type { SeatMapCanvasProps } from '../type'
import { ObjectActionBar } from '@/components/edit/ObjectActionBar'
import type { LayoutObjectRef } from '@/types'

// 会議室・家具の属性バー(ObjectActionBar)を出すかどうかと、各トグル・削除の行き先

type Props = Pick<
  SeatMapCanvasProps,
  'onObjectLockToggle' | 'onObjectLabelToggle' | 'onObjectDeleteRequest'
> & {
  isEditMode: boolean
  view: Pick<CanvasViewModel, 'objectActionBarPos' | 'selectedObjectAttrs'>
  edit: Pick<EditDragState, 'editSelectedObject'>
  repositioningRef: LayoutObjectRef | null
}

export const SelectedObjectBar = ({
  isEditMode,
  view,
  edit,
  repositioningRef,
  onObjectLockToggle,
  onObjectLabelToggle,
  onObjectDeleteRequest,
}: Props) => {
  // 05-3: 属性バーの材料。ローカル const へ写すのはコールバックの中でも絞り込みを効かせるため
  // (view.x / edit.x のままだと呼び出しごとに null 判定が要る)
  const selectedObject = edit.editSelectedObject
  const objectAttrs = view.selectedObjectAttrs

  return (
    <>
      {/* 05-3: 移動ゴーストが出ている間は隠す。ゴースト層(z=overlay)の暗幕の下へ潜って
        触れなくなるため、出しっぱなしにすると「押せないボタン」になる */}
      {isEditMode &&
        view.objectActionBarPos &&
        objectAttrs &&
        selectedObject &&
        !repositioningRef && (
          <ObjectActionBar
            x={view.objectActionBarPos.x}
            y={view.objectActionBarPos.y}
            name={objectAttrs.name}
            locked={objectAttrs.locked}
            labelVisible={objectAttrs.labelVisible}
            canToggleLabel={objectAttrs.canToggleLabel}
            onToggleLock={() => onObjectLockToggle?.(selectedObject, !objectAttrs.locked)}
            onToggleLabel={() => onObjectLabelToggle?.(selectedObject, !objectAttrs.labelVisible)}
            onDelete={() => onObjectDeleteRequest?.(selectedObject)}
          />
        )}
    </>
  )
}
