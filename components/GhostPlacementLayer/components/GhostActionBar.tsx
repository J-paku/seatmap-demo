import styles from '../ghost-placement.module.css'
// 画面下部の確定・キャンセル。重なっている間は確定を押させない

type Props = {
  label: string
  blocked: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const GhostActionBar = ({ label, blocked, onConfirm, onCancel }: Props) => (
  <div className={styles.actionbar}>
    <span className={styles.actionbarLabel}>{label}</span>
    <button type='button' className='pixel-btn ghost-actionbar-cancel' onClick={onCancel}>
      キャンセル
    </button>
    <button
      type='button'
      className={`pixel-btn ${styles.actionbarConfirm}`}
      onClick={onConfirm}
      disabled={blocked}
    >
      確定
    </button>
  </div>
)
