// 07-admin-edit: 削除確認ダイアログ(着席中は着席者名を表示して警告)
import { useSwipeDismiss } from '@/lib/use-swipe-dismiss'

type Props = {
  employeeName: string | null
  onConfirm: () => void
  onCancel: () => void
}

export const DeleteConfirmDialog = ({ employeeName, onConfirm, onCancel }: Props) => {
  // 下スワイプはキャンセルと同じ扱い(削除確定にはしない)
  const { sheetRef, bind } = useSwipeDismiss({ onClose: onCancel })

  return (
    <div className='edit-dialog-backdrop' onClick={onCancel}>
      <div
        ref={sheetRef}
        className='edit-dialog'
        role='dialog'
        aria-modal='true'
        aria-label='座席削除の確認'
        onClick={(e) => e.stopPropagation()}
        {...bind}
      >
        <p className='edit-dialog-message'>
          {employeeName ? (
            <>
              この座席には<strong>{employeeName}</strong>さんが着席しています。削除しますか？
            </>
          ) : (
            'この座席を削除しますか？'
          )}
        </p>
        <div className='edit-dialog-actions'>
          <button type='button' className='pixel-btn edit-dialog-cancel' onClick={onCancel}>
            やめる
          </button>
          <button type='button' className='pixel-btn edit-dialog-confirm' onClick={onConfirm}>
            削除する
          </button>
        </div>
      </div>
    </div>
  )
}
