// 07-admin-edit: 下端リモートバー(「変更n件」カウンター+「完了」主ボタン・「キャンセル」副ボタン)
import { triggerHaptic } from '@/utils/haptic'
import e from './admin-edit.module.css'
type Props = {
  changedCount: number
  isSaving: boolean
  onFinish: () => void
  onCancel: () => void
}

export const EditRemoteBar = ({ changedCount, isSaving, onFinish, onCancel }: Props) => {
  const canComplete = changedCount >= 1

  return (
    <div className={`${e.editRemoteBar} liquid-glass`}>
      <span className={e.editRemoteCount}>変更{changedCount}件</span>
      <button
        type='button'
        className={e.editRemoteCancel}
        onClick={() => {
          triggerHaptic('light')
          onCancel()
        }}
        disabled={isSaving}
      >
        キャンセル
      </button>
      <button
        type='button'
        className={e.editRemoteFinish}
        onClick={() => {
          if (!canComplete) return
          triggerHaptic('success')
          onFinish()
        }}
        disabled={!canComplete || isSaving}
      >
        {isSaving ? '保存中…' : '完了'}
      </button>
    </div>
  )
}
