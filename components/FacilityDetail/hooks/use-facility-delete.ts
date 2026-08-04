import { useCallback, useState } from 'react'
import { useSeatLayout } from '@/lib/mock-loader'
import { applyLayoutAction } from '@/utils/layout-actions'

type Args = {
  // レイアウト上の Facility.id(予定システム側の facilityId ではない)
  facilityId: string
  facilityName: string
  onDeleted: (facilityName: string) => void
  onClose: () => void
}

// 施設削除の確認ダイアログ状態と確定処理。保存はレイアウト全体の上書きで行う
export const useFacilityDelete = ({ facilityId, facilityName, onDeleted, onClose }: Args) => {
  const { layout, persistLayout } = useSeatLayout()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const open = useCallback(() => setIsDialogOpen(true), [])
  const cancel = useCallback(() => setIsDialogOpen(false), [])

  const confirm = useCallback(async () => {
    if (!layout || isDeleting) return
    setIsDeleting(true)
    await persistLayout(applyLayoutAction(layout, { type: 'object-delete', kind: 'facility', id: facilityId }))
    setIsDeleting(false)
    setIsDialogOpen(false)
    onDeleted(facilityName)
    onClose()
  }, [layout, isDeleting, persistLayout, facilityId, facilityName, onDeleted, onClose])

  return { isDialogOpen, isDeleting, open, cancel, confirm }
}
