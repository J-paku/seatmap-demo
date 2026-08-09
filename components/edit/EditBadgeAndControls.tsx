// 07-admin-edit: 編集中バッジ(キャンバス左上)+上端コントロール(？/×・右上)
import e from './admin-edit.module.css'
type Props = {
  onHelp: () => void
  onExit: () => void
}

export const EditBadge = () => (
  <div className={e.editModeBadge} data-edit-mode-badge='true'>
    <span className={e.editModeBadgeDot} />
    編集中
  </div>
)

// ？ は静的な説明ではなくツアーを再生する。既読フラグは無視して何度でも見られる
export const EditTopControls = ({ onHelp, onExit }: Props) => (
  <div className={e.editTopControls}>
    <button type='button' className={`pixel-btn ${e.editTopBtn}`} aria-label='操作ガイドを見る' onClick={onHelp}>
      ？
    </button>
    <button type='button' className={`pixel-btn ${e.editTopBtn}`} aria-label='編集を終了' onClick={onExit}>
      ×
    </button>
  </div>
)
