// 07-admin-edit: 削除確認ダイアログ(着席中は着席者名を表示して警告)
type Props = {
  employeeName: string | null
  onConfirm: () => void
  onCancel: () => void
}

export const DeleteConfirmDialog = ({ employeeName, onConfirm, onCancel }: Props) => (
  <div className='edit-dialog-backdrop' onClick={onCancel}>
    <div
      className='edit-dialog'
      role='dialog'
      aria-modal='true'
      aria-label='座席削除の確認'
      onClick={(e) => e.stopPropagation()}
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
