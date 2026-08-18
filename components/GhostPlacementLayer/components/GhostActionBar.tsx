import styles from '../ghost-placement.module.css'
import { triggerHaptic } from '@/utils/haptic'
// 画面下部の削除・確定・キャンセル。重なっている間は確定を押させない。
// 並びは [削除][配置][取消] で、伸びるのは主ボタンである確定だけ。
// 対象名はバーへ置かない — 移動モードなら枠のバッジが既に出しており、新規配置では要らない

type Props = {
  label: string
  blocked: boolean
  // 移動モード('reposition')のときだけ左端に削除ボタンを出す(§04-4)
  mode: 'create' | 'move'
  // 削除の確認が開いている間。二度押しさせない
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
  // 削除の実処理は呼び出し側が持つ。未指定なら移動モードでも削除ボタンを出さない
  onDelete?: () => void
}

export const GhostActionBar = ({ label, blocked, mode, isDeleting, onConfirm, onCancel, onDelete }: Props) => {
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
    // 取り返しのつかない操作が、確定(medium)より軽い手応えで始まってはいけない
    triggerHaptic('medium')
    onDelete()
  }

  return (
    <div className={`${styles.actionbar} liquid-glass glass-stagger-item`} data-ghost='actionbar'>
      {mode === 'move' && onDelete && (
        <button
          type='button'
          className={`pixel-btn ${styles.actionbarDelete}`}
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label={`${label}を削除`}
        >
          <span className='material-symbols-outlined' aria-hidden='true'>
            delete
          </span>
        </button>
      )}
      <button
        type='button'
        className={`pixel-btn ${styles.actionbarConfirm}`}
        onClick={handleConfirm}
        disabled={blocked}
        aria-label={blocked ? '重なっているため配置できません' : 'この位置に配置'}
      >
        <span className='material-symbols-outlined' aria-hidden='true'>
          {blocked ? 'block' : 'check'}
        </span>
        配置
      </button>
      <button
        type='button'
        className={`pixel-btn ${styles.actionbarCancel}`}
        onClick={handleCancel}
        aria-label='配置をキャンセル'
      >
        <span className='material-symbols-outlined' aria-hidden='true'>
          close
        </span>
      </button>
    </div>
  )
}
