import { clamp } from '@/utils/layout/geometry'
import styles from '../ghost-placement.module.css'
// ヒント文言。ゴーストの直下に出し、画面下端に近いときは上へ反転する

// 反転に切り替える下端からの距離(§04-2: 画面下端110px圏内)
const FLIP_MARGIN_PX = 110
const GAP_PX = 12
// 左右の画面端からの最小余白(§04-2: 左右80pxクランプ)
const EDGE_CLAMP_PX = 80

type Props = {
  rect: { left: number; top: number; width: number; height: number }
  blocked: boolean
}

export const GhostHint = ({ rect, blocked }: Props) => {
  const below = rect.top + rect.height + GAP_PX
  const flipped = below > window.innerHeight - FLIP_MARGIN_PX
  const centerX = clamp(rect.left + rect.width / 2, EDGE_CLAMP_PX, window.innerWidth - EDGE_CLAMP_PX)
  return (
    <p
      className={`${styles.hint}${blocked ? ` ${styles.isBlocked}` : ''}`}
      style={{
        left: centerX,
        top: flipped ? rect.top - GAP_PX : below,
        transform: flipped ? 'translate(-50%, -100%)' : 'translateX(-50%)',
      }}
      role='status'
      aria-live='polite'
    >
      {blocked ? 'ここには配置できません' : 'ドラッグで移動'}
    </p>
  )
}
