import styles from '../ghost-placement.module.css'
import { triggerHaptic } from '@/utils/haptic'
// 画面下部の確定・キャンセル。重なっている間は確定を押させない

type Props = {
  label: string
  blocked: boolean
  // 移動モード('reposition')のときだけ左端に削除ボタンを出す(§04-4)
  mode: 'create' | 'move'
  onConfirm: () => void
  onCancel: () => void
  // 削除の実処理は呼び出し側が持つ。未指定なら移動モードでも削除ボタンを出さない
  onDelete?: () => void
}

export const GhostActionBar = ({ label, blocked, mode, onConfirm, onCancel, onDelete }: Props) => {
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

  const handleDelete = () => {
    if (!onDelete) return
    triggerHaptic('light')
    onDelete()
  }

  return (
    <div className={`${styles.actionbar} liquid-glass glass-stagger-item`}>
      {mode === 'move' && onDelete && (
        <button
          type='button'
          className={`pixel-btn ${styles.actionbarIconOnly}`}
          onClick={handleDelete}
          aria-label={`${label}を削除`}
        >
          <span className='material-symbols-outlined' aria-hidden='true'>
            delete
          </span>
        </button>
      )}
      <span className={styles.actionbarLabel}>{label}</span>
      <button
        type='button'
        className={`pixel-btn ghost-actionbar-cancel ${styles.actionbarIconOnly}`}
        onClick={handleCancel}
        aria-label='配置をキャンセル'
      >
        <span className='material-symbols-outlined' aria-hidden='true'>
          close
        </span>
      </button>
      <button
        type='button'
        className={`pixel-btn ${styles.actionbarConfirm}`}
        onClick={handleConfirm}
        disabled={blocked}
        aria-label={blocked ? '重なっているため配置できません' : 'この位置に配置'}
      >
        <span className='material-symbols-outlined' aria-hidden='true'>
          check
        </span>
        配置
      </button>
    </div>
  )
}
