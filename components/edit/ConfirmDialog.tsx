// 汎用の確認ダイアログ。文言だけを差し替えて使う。
// 既存の DeleteConfirmDialog / ObjectDeleteDialog は同じ .edit-dialog を持つが
// 文面が固有なのでそのまま残している(移行するなら別件で)
import type { ReactNode } from 'react'
import { useSwipeDismiss } from '@/hooks/use-swipe-dismiss'
import e from './admin-edit.module.css'

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
    <div className={e.editDialogBackdrop} onClick={onCancel}>
      <div
        ref={sheetRef}
        className={e.editDialog}
        role='dialog'
        aria-modal='true'
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
        {...bind}
      >
        <p className={e.editDialogMessage}>{message}</p>
        <div className={e.editDialogActions}>
          <button type='button' className={`pixel-btn ${e.editDialogCancel}`} onClick={onCancel}>
            やめる
          </button>
          <button type='button' className={`pixel-btn ${e.editDialogConfirm}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
