import { useCallback, useState } from 'react'
import { useSeatLayout } from '@/hooks/use-mock-data'
import { useLayoutSource } from '@/contexts/layout-source-context'
import { useGlobalAnnouncement } from '@/contexts/announcement-context'
import { loadSourceLayout } from '@/lib/layout-persistence'
import { VALID_EMPLOYEE_IDS } from '@/utils/collect-employee-ids'
import { applyLayoutAction } from '@/utils/layout/layout-actions'
import { isCustomSaveConflict } from '@/utils/layout/judge-save-conflict'
import { TOAST_MESSAGES } from '@/utils/toast-messages'

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
  const { source } = useLayoutSource()
  const { announce } = useGlobalAnnouncement()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const open = useCallback(() => setIsDialogOpen(true), [])
  const cancel = useCallback(() => setIsDialogOpen(false), [])

  // 削除できなかった時(別タブが先にカスタムレイアウトを更新していた・書き込みが投げた)は、
  // 知らせるだけで確認ダイアログも詳細パネルも閉じない。削除中フラグは必ず下ろす
  // (下ろし忘れると確定ボタンが「削除中...」で押せないまま戻らない)
  const confirm = useCallback(async () => {
    if (!layout || isDeleting) return
    setIsDeleting(true)
    try {
      // 05-6: カスタムレイアウトだけ楽観ロックを照合する(公式は仕様上競合検知なし)。
      // 照合の基準は削除の元にした表示中レイアウトの版
      const currentStored = loadSourceLayout(source, VALID_EMPLOYEE_IDS)
      if (isCustomSaveConflict(source, layout.updatedTime, currentStored)) {
        announce(`[warning]${TOAST_MESSAGES.CONFLICT_UPDATE}`)
        return
      }
      await persistLayout(
        applyLayoutAction(layout, { type: 'object-delete', kind: 'facility', id: facilityId })
      )
    } catch {
      announce(`[error]${TOAST_MESSAGES.SAVE_FAILED}`)
      return
    } finally {
      setIsDeleting(false)
    }
    setIsDialogOpen(false)
    onDeleted(facilityName)
    onClose()
  }, [
    layout,
    isDeleting,
    source,
    announce,
    persistLayout,
    facilityId,
    facilityName,
    onDeleted,
    onClose,
  ])

  return { isDialogOpen, isDeleting, open, cancel, confirm }
}
