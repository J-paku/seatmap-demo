import styles from '../ghost-placement.module.css'
import { triggerHaptic } from '@/utils/haptic'
// 画面下部の確定・キャンセル。重なっている間は確定を押させない

type Props = {
  label: string
  blocked: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const GhostActionBar = ({ label, blocked, onConfirm, onCancel }: Props) => {
  const handleConfirm = () => {
    // disabled とここでの二重ガード。blocked 中は確定処理に一切入らない
    if (blocked) return
    triggerHaptic('medium')
    onConfirm()
  }

  const handleCancel = () => {
    triggerHaptic('light')
    onCancel()
  }

  return (
    <div className={`${styles.actionbar} liquid-glass`}>
      <span className={styles.actionbarLabel}>{label}</span>
      <button type='button' className='pixel-btn ghost-actionbar-cancel' onClick={handleCancel}>
        キャンセル
      </button>
      <button
        type='button'
        className={`pixel-btn ${styles.actionbarConfirm}`}
        onClick={handleConfirm}
        disabled={blocked}
        aria-label={blocked ? '重なっているため配置できません' : undefined}
      >
        確定
      </button>
    </div>
  )
}
