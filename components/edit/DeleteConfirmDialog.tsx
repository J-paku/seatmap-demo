// 07-admin-edit: 削除確認ダイアログ(着席中は着席者名を表示して警告)
import { useSwipeDismiss } from '@/hooks/use-swipe-dismiss'
import e from './admin-edit.module.css'

type Props = {
  employeeName: string | null
  onConfirm: () => void
  onCancel: () => void
}

export const DeleteConfirmDialog = ({ employeeName, onConfirm, onCancel }: Props) => {
  // 下スワイプはキャンセルと同じ扱い(削除確定にはしない)
  const { sheetRef, bind } = useSwipeDismiss({ onClose: onCancel })

  return (
    <div className={e.editDialogBackdrop} onClick={onCancel}>
      <div
        ref={sheetRef}
        className={e.editDialog}
        role='dialog'
        aria-modal='true'
        aria-label='座席削除の確認'
        onClick={(e) => e.stopPropagation()}
        {...bind}
      >
        <p className={e.editDialogMessage}>
          {employeeName ? (
            <>
              この座席には<strong>{employeeName}</strong>さんが着席しています。削除しますか？
            </>
          ) : (
            'この座席を削除しますか？'
          )}
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
