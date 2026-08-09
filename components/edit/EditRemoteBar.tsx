// 07-admin-edit: 下端リモートバー(「変更n件」カウンター+「完了」主ボタン・「キャンセル」副ボタン)
import e from './admin-edit.module.css'
type Props = {
  changedCount: number
  isSaving: boolean
  onFinish: () => void
  onCancel: () => void
}

export const EditRemoteBar = ({ changedCount, isSaving, onFinish, onCancel }: Props) => (
  <div className={e.editRemoteBar}>
    <span className={e.editRemoteCount}>変更{changedCount}件</span>
    <button type='button' className={`pixel-btn ${e.editRemoteCancel}`} onClick={onCancel} disabled={isSaving}>
      キャンセル
    </button>
    <button type='button' className={`pixel-btn ${e.editRemoteFinish}`} onClick={onFinish} disabled={isSaving}>
      {isSaving ? '保存中…' : '完了'}
    </button>
  </div>
)
