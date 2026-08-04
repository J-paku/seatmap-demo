// 画面下部の確定・キャンセル。重なっている間は確定を押させない

type Props = {
  label: string
  blocked: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const GhostActionBar = ({ label, blocked, onConfirm, onCancel }: Props) => (
  <div className='ghost-actionbar'>
    <span className='ghost-actionbar-label'>{label}</span>
    <button type='button' className='pixel-btn ghost-actionbar-cancel' onClick={onCancel}>
      キャンセル
    </button>
    <button
      type='button'
      className='pixel-btn ghost-actionbar-confirm'
      onClick={onConfirm}
      disabled={blocked}
    >
      確定
    </button>
  </div>
)
