// 07-admin-edit: 編集中バッジ(キャンバス左上)+上端コントロール(？/×・右上)
type Props = {
  onHelp: () => void
  onExit: () => void
}

export const EditBadge = () => (
  <div className='edit-mode-badge'>
    <span className='edit-mode-badge-dot' />
    編集中
  </div>
)

// ？ は静的な説明ではなくツアーを再生する。既読フラグは無視して何度でも見られる
export const EditTopControls = ({ onHelp, onExit }: Props) => (
  <div className='edit-top-controls'>
    <button type='button' className='pixel-btn edit-top-btn' aria-label='操作ガイドを見る' onClick={onHelp}>
      ？
    </button>
    <button type='button' className='pixel-btn edit-top-btn' aria-label='編集を終了' onClick={onExit}>
      ×
    </button>
  </div>
)
