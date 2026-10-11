import { useCallback } from 'react'
import type { ShowUndoChipAt } from './use-canvas-handle'
import type { ObjectPlacement } from './use-object-placement'
import type { LayoutEditor } from '../type'
import { rectOfRef } from '@/utils/layout/layout-objects'
import type { LayoutObjectRef, SeatLayout } from '@/types'

// 削除の実行はここに集約する。ダイアログ経由(会議室・チーム)も即時(家具)も同じ後始末を通す。
// チームだけ発行口が違う(所属座席ごと消えるため object-delete では扱えない)

type Options = {
  editor: LayoutEditor
  effectiveLayout: SeatLayout | undefined
  showUndoChipAt: ShowUndoChipAt
  placement: ObjectPlacement
}

export const useObjectDelete = ({
  editor,
  effectiveLayout,
  showUndoChipAt,
  placement,
}: Options): ((ref: LayoutObjectRef) => void) => {
  const handleDeleteObject = useCallback(
    (ref: LayoutObjectRef) => {
      const rect = effectiveLayout ? rectOfRef(effectiveLayout, ref) : null
      if (ref.kind === 'team') editor.deleteTeam(ref.id)
      else editor.deleteObject(ref)
      if (rect) showUndoChipAt(rect, '削除しました', rect)
      // 削除が成立した時だけゴーストを畳む。確認を開いた時点では畳まない —
      // 確認をやめた利用者が、動かした位置のゴーストへそのまま戻れるようにする
      if (placement.isActive) placement.cancel()
    },
    [editor, effectiveLayout, showUndoChipAt, placement.isActive, placement.cancel]
  )

  return handleDeleteObject
}
