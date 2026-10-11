import { useCallback, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { LayoutEditor } from '../type'

// 05-4: 座席の一括操作バーの受け口(大型化と、2席以上の一括削除の確認)

export type SeatBulkActions = {
  handleSeatEnlarge: (seatIds: string[]) => void
  // 2席以上の一括削除の対象。null なら確認を出さない
  bulkDeleteSeatIds: string[] | null
  setBulkDeleteSeatIds: Dispatch<SetStateAction<string[] | null>>
  confirmBulkDelete: () => void
}

export const useSeatBulkActions = (editor: LayoutEditor): SeatBulkActions => {
  // 05-4:「大型」= shape:'executive' の一括適用。バーが持つ形状はこれ1つなのでここで固定する
  const handleSeatEnlarge = useCallback(
    (seatIds: string[]) => editor.reshapeSeats(seatIds, 'executive'),
    [editor]
  )

  // 05-4: 2席以上の一括削除。件数つきの確認を挟んでから1アクションで消す(undo 1回で戻る)。
  // 1席のときは既存の単独確認(dialogs.requestSeatDelete)がそのまま受ける
  const [bulkDeleteSeatIds, setBulkDeleteSeatIds] = useState<string[] | null>(null)
  const confirmBulkDelete = useCallback(() => {
    if (bulkDeleteSeatIds) editor.deleteSeats(bulkDeleteSeatIds)
    setBulkDeleteSeatIds(null)
  }, [bulkDeleteSeatIds, editor])

  return { handleSeatEnlarge, bulkDeleteSeatIds, setBulkDeleteSeatIds, confirmBulkDelete }
}
