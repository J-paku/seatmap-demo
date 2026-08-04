// 汎用の確認ダイアログ。文言だけを差し替えて使う。
// 既存の DeleteConfirmDialog / ObjectDeleteDialog は同じ .edit-dialog を持つが
// 文面が固有なのでそのまま残している(移行するなら別件で)
import type { ReactNode } from 'react'
import { useSwipeDismiss } from '@/hooks/use-swipe-dismiss'

type Props = {
  ariaLabel: string
  message: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmDialog = ({ ariaLabel, message, confirmLabel, onConfirm, onCancel }: Props) => {
  // 下スワイプはキャンセルと同じ扱い(確定にはしない)
  const { sheetRef, bind } = useSwipeDismiss({ onClose: onCancel })

  return (
    <div className='edit-dialog-backdrop' onClick={onCancel}>
      <div
        ref={sheetRef}
        className='edit-dialog'
        role='dialog'
        aria-modal='true'
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
        {...bind}
      >
        <p className='edit-dialog-message'>{message}</p>
        <div className='edit-dialog-actions'>
          <button type='button' className='pixel-btn edit-dialog-cancel' onClick={onCancel}>
            やめる
          </button>
          <button type='button' className='pixel-btn edit-dialog-confirm' onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
