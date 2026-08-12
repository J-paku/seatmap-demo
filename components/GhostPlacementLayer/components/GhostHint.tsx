import { clamp } from '@/utils/layout/geometry'
import type { PlacementBlockReason } from '@/utils/layout/layout-rules'
import styles from '../ghost-placement.module.css'
// ヒント文言。ゴーストの直下に出し、画面下端に近いときは上へ反転する

// 反転に切り替える下端からの距離(§04-2: 画面下端110px圏内)
const FLIP_MARGIN_PX = 110
const GAP_PX = 12
// 左右の画面端からの最小余白(§04-2: 左右80pxクランプ)
const EDGE_CLAMP_PX = 80

type Props = {
  rect: { left: number; top: number; width: number; height: number }
  blockReason: PlacementBlockReason | null
}

// 置けない理由で文言を分ける。「フロア外」は画面上ただの余白に見えるので、理由を言葉で伝えるしかない
const hintText = (reason: PlacementBlockReason | null): string => {
  if (reason === null) return 'ドラッグで移動'
  return reason.kind === 'outside-floor' ? 'フロアの外には配置できません' : '赤い枠と重なっています'
}

export const GhostHint = ({ rect, blockReason }: Props) => {
  const blocked = blockReason !== null
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
      {hintText(blockReason)}
    </p>
  )
}
