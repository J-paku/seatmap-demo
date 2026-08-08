import { useId } from 'react'
import { useAlertDialog } from './hooks/use-alert-dialog'
import styles from './alert-dialog.module.css'

// 選択を迫らない告知用の中央ダイアログ。ボタンは確認1つだけでキャンセルを置かない
// 背景スクロールの固定は呼び出し元のシートが済ませているためここでは触らない

type Props = {
  isOpen: boolean
  icon: string
  title: string
  body: string
  confirmLabel: string
  onClose: () => void
}

export const AlertDialog = ({ isOpen, icon, title, body, confirmLabel, onClose }: Props) => {
  const { panelRef, confirmRef } = useAlertDialog(isOpen)
  const baseId = useId()

  if (!isOpen) return null

  const titleId = `${baseId}-title`
  const bodyId = `${baseId}-body`

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={panelRef}
        className={styles.dialog}
        role='alertdialog'
        aria-modal='true'
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key !== 'Escape') return
          // 詳細パネル側の ESC ハンドラへ届かせない(カードまで一緒に閉じてしまう)
          e.stopPropagation()
          onClose()
        }}
      >
        <span className={`${styles.icon} material-symbols-outlined`} aria-hidden='true'>
          {icon}
        </span>
        <h2 className={styles.title} id={titleId}>
          {title}
        </h2>
        <p className={styles.body} id={bodyId}>
          {body}
        </p>
        <button type='button' ref={confirmRef} className={styles.confirm} onClick={onClose}>
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}
