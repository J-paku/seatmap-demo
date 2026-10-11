import type { ReactNode } from 'react'
import { isMarginClick } from '../utils/judge-overlay-click'
import styles from '../team-overlay-modal.module.css'

// オーバーレイの最外枠(全面のラッパー)と背景。余白か背景をクリックすると閉じる。
// パネル・ダイアログ群・ガイドは children としてこの直下に置く

type Props = {
  isCompactMobile: boolean
  // 閉じる口。編集中の破棄確認を挟む guardedClose を渡す
  onClose: () => void
  children: ReactNode
}

export const OverlayWrap = ({ isCompactMobile, onClose, children }: Props) => (
  <div
    className={`${styles.wrap}${isCompactMobile ? ` ${styles.isCompact}` : ''}`}
    onClick={e => {
      // ラッパー余白クリックで閉じる(パネル自身のクリックは stopPropagation)
      if (isMarginClick(e.target, e.currentTarget)) onClose()
    }}
  >
    <div className={styles.backdrop} onClick={onClose} />
    {children}
  </div>
)
