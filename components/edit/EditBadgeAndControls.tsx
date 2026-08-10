// 07-admin-edit: 上端コントロール(？/×・右上)
// 編集中バッジは 09 で EditingOverlay の editingOverlayLabel に統合した(役割が重複するため)
import { triggerHaptic } from '@/utils/haptic'
import { GuideButton } from '@/components/GuideButton'
import e from './admin-edit.module.css'
type Props = {
  onHelp: () => void
  onExit: () => void
}

// ？ は静的な説明ではなくツアーを再生する。既読フラグは無視して何度でも見られる
export const EditTopControls = ({ onHelp, onExit }: Props) => (
  <div className={e.editTopControls}>
    <GuideButton ariaLabel='操作ガイドを見る' onClick={onHelp} />
    <button
      type='button'
      className={`${e.editTopBtn} liquid-glass`}
      aria-label='編集を終了'
      onClick={() => {
        triggerHaptic('light')
        onExit()
      }}
    >
      ×
    </button>
  </div>
)
