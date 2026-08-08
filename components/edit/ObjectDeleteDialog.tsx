// 会議室の削除確認。家具は名前を持たず誤操作の被害も小さいので確認を挟まない(呼び出し側で分岐)
import { useSwipeDismiss } from '@/hooks/use-swipe-dismiss'
import e from './admin-edit.module.css'

type Props = {
  facilityName: string
  onConfirm: () => void
  onCancel: () => void
}

export const ObjectDeleteDialog = ({ facilityName, onConfirm, onCancel }: Props) => {
  // 下スワイプはキャンセルと同じ扱い(削除確定にはしない)
  const { sheetRef, bind } = useSwipeDismiss({ onClose: onCancel })

  return (
    <div className={e.editDialogBackdrop} onClick={onCancel}>
      <div
        ref={sheetRef}
        className={e.editDialog}
        role='dialog'
        aria-modal='true'
        aria-label='施設削除の確認'
        onClick={(e) => e.stopPropagation()}
        {...bind}
      >
        <p className={e.editDialogMessage}>
          この施設を削除しますか？
          <br />
          <strong>{facilityName}</strong>
        </p>
        <div className={e.editDialogActions}>
          <button type='button' className={`pixel-btn ${e.editDialogCancel}`} onClick={onCancel}>
            やめる
          </button>
          <button type='button' className={`pixel-btn ${e.editDialogConfirm}`} onClick={onConfirm}>
            削除する
          </button>
        </div>
      </div>
    </div>
  )
}
