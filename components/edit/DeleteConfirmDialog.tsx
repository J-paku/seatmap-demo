// 07-admin-edit: 座席削除確認ダイアログ(§07-2)。
// 一括(2席以上) / 空席1席(完全削除) / 在席1席(空席化) の3ケースで文言を分岐する。
// ロック中の座席が対象の場合は削除確認自体を出さず、削除不可の通知に切り替える(locked props)
import { useSwipeToDismiss } from '@/hooks/use-swipe-to-dismiss'
import { triggerHaptic } from '@/utils/haptic'
import e from './admin-edit.module.css'

// ロック中で削除できない旨の通知。単一座席のラベル表示と全席ロックとで文言が異なる
type LockedNotice = { kind: 'single'; seatLabel: string } | { kind: 'all' }

type Props = {
  // 既存呼び出し(components/SeatMapView/components/EditDialogs.tsx)互換のため必須のまま残す。
  // null なら空席1席ケース、文字列なら在席1席ケースとして扱う
  employeeName: string | null
  onConfirm: () => void
  onCancel: () => void
  // §07-2 の3ケース分岐用(新規呼び出し側が渡す想定・省略可)。count が2以上のときのみ一括ケース優先
  count?: number
  // 在席1席ケースの部署表示。省略時は「(部署)」部分を出さない(既存呼び出しは未対応のため)
  department?: string | null
  // 指定時は削除確認自体を出さず、ロック中の通知に切り替える
  locked?: LockedNotice
}

export const DeleteConfirmDialog = ({ employeeName, onConfirm, onCancel, count, department, locked }: Props) => {
  // 下スワイプはキャンセルと同じ扱い(削除確定にはしない)
  const { sheetHandlers, dragStyle } = useSwipeToDismiss({ onDismiss: onCancel })

  const handleCancel = () => {
    triggerHaptic('light')
    onCancel()
  }

  if (locked) {
    const lockedMessage =
      locked.kind === 'all'
        ? '選択した座席はすべてロック中のため削除できません'
        : `「${locked.seatLabel}」はロックまたはレイアウト固定中のため座席を削除できません`

    return (
      <div className={e.editDialogBackdrop} onClick={onCancel}>
        <div
          className={e.editDialog}
          role='dialog'
          aria-modal='true'
          aria-label={lockedMessage}
          onClick={(e) => e.stopPropagation()}
          {...sheetHandlers}
          style={{
            transform: dragStyle.transform,
            transition: dragStyle.transition,
            willChange: dragStyle.willChange,
          }}
        >
          <div className={e.editDialogIconBadge}>
            <span className='material-symbols-outlined' aria-hidden='true'>
              lock
            </span>
          </div>
          <p className={e.editDialogMessage}>{lockedMessage}</p>
          <div className={e.editDialogActions}>
            <button type='button' className={`pixel-btn ${e.editDialogCancel}`} onClick={handleCancel}>
              閉じる
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isBulk = typeof count === 'number' && count >= 2
  const isOccupied = !isBulk && employeeName !== null

  const title = isBulk
    ? `${count}席を削除しますか？`
    : isOccupied
      ? 'この席を空席にしますか？'
      : 'この空席を完全に削除しますか？'

  const message = isBulk
    ? `選択した${count}席を削除します。配置済みの社員は解除されます。この操作は保存後に確定されます。`
    : isOccupied
      ? `${employeeName}${department ? `(${department})` : ''} を空席にします。空席は再度削除で完全に除去できます。`
      : 'この空席を完全に削除します。この操作は保存後に確定されます。'

  const confirmLabel = isBulk ? '削除する' : isOccupied ? '空席にする' : '完全に削除'
  // 「空席にする」は完全削除ではないため非danger(§07-1: その他=medium)。
  // 一括削除・空席の完全削除はdanger(§07-1: danger=error)
  const isDangerVariant = !isOccupied

  const handleConfirm = () => {
    triggerHaptic(isDangerVariant ? 'error' : 'medium')
    onConfirm()
  }

  return (
    <div className={e.editDialogBackdrop} onClick={onCancel}>
      <div
        className={e.editDialog}
        role='dialog'
        aria-modal='true'
        aria-label={title}
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
        <div className={`${e.editDialogIconBadge} ${isDangerVariant ? '' : e.isDefaultVariant}`}>
          <span className='material-symbols-outlined' aria-hidden='true'>
            {isDangerVariant ? 'delete_forever' : 'person_remove'}
          </span>
        </div>
        <p className={e.editDialogTitle}>{title}</p>
        <p className={e.editDialogMessage}>{message}</p>
        <div className={e.editDialogActions}>
          <button type='button' className={`pixel-btn ${e.editDialogCancel}`} onClick={handleCancel}>
            やめる
          </button>
          <button
            type='button'
            className={`pixel-btn ${e.editDialogConfirm} ${isDangerVariant ? '' : e.isDefaultVariant}`}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
