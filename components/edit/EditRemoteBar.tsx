// 07-admin-edit: 下端リモートバー(「変更n件」カウンター+「完了」主ボタン・「キャンセル」副ボタン)
type Props = {
  changedCount: number
  isSaving: boolean
  onFinish: () => void
  onCancel: () => void
}

export const EditRemoteBar = ({ changedCount, isSaving, onFinish, onCancel }: Props) => (
  <div className='edit-remote-bar'>
    <span className='edit-remote-count'>変更{changedCount}件</span>
    <button type='button' className='pixel-btn edit-remote-cancel' onClick={onCancel} disabled={isSaving}>
      キャンセル
    </button>
    <button type='button' className='pixel-btn edit-remote-finish' onClick={onFinish} disabled={isSaving}>
      {isSaving ? '保存中…' : '完了'}
    </button>
  </div>
)
