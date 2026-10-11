// 会議室の削除確認。家具は名前を持たず誤操作の被害も小さいので確認を挟まない(呼び出し側で分岐)
import { useSwipeToDismiss } from '@/hooks/use-swipe-to-dismiss'
import { triggerHaptic } from '@/utils/haptic'
import e from './admin-edit.module.css'

type Props = {
  facilityName: string
  onConfirm: () => void
  onCancel: () => void
}

export const ObjectDeleteDialog = ({ facilityName, onConfirm, onCancel }: Props) => {
  // 下スワイプはキャンセルと同じ扱い(削除確定にはしない)
  const { sheetHandlers, dragStyle } = useSwipeToDismiss({ onDismiss: onCancel })

  const handleCancel = () => {
    triggerHaptic('light')
    onCancel()
  }

  const handleConfirm = () => {
    triggerHaptic('error')
    onConfirm()
  }

  return (
    <div className={e.editDialogBackdrop} onClick={onCancel}>
      <div
        className={e.editDialog}
        role='dialog'
        aria-modal='true'
        aria-label='施設削除の確認'
        onClick={(e) => e.stopPropagation()}
        {...sheetHandlers}
        style={{
          transform: dragStyle.transform,
          transition: dragStyle.transition,
          willChange: dragStyle.willChange,
        }}
      >
        <button type='button' className={e.editDialogClose} aria-label='閉じる' onClick={handleCancel}>
          <span className='material-symbols-outlined' aria-hidden='true'>
            close
          </span>
        </button>
        <div className={e.editDialogIconBadge}>
          <span className='material-symbols-outlined' aria-hidden='true'>
            meeting_room
          </span>
        </div>
        <p className={e.editDialogMessage}>
          この施設を削除しますか？
          <br />
          <strong>{facilityName}</strong>
        </p>
        <div className={e.editDialogActions}>
          <button type='button' className={`pixel-btn ${e.editDialogCancel}`} onClick={handleCancel}>
            やめる
          </button>
          <button type='button' className={`pixel-btn ${e.editDialogConfirm}`} onClick={handleConfirm}>
            削除する
          </button>
        </div>
      </div>
    </div>
  )
}
