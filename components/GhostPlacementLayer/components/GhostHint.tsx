import styles from '../ghost-placement.module.css'
// ヒント文言。ゴーストの直下に出し、画面下端に近いときは上へ反転する

// 反転に切り替える下端からの距離
const FLIP_MARGIN_PX = 120
const GAP_PX = 12

type Props = {
  rect: { left: number; top: number; width: number; height: number }
  blocked: boolean
}

export const GhostHint = ({ rect, blocked }: Props) => {
  const below = rect.top + rect.height + GAP_PX
  const flipped = below > window.innerHeight - FLIP_MARGIN_PX
  return (
    <p
      className={`${styles.hint}${blocked ? ` ${styles.isBlocked}` : ''}`}
      style={{
        left: rect.left + rect.width / 2,
        top: flipped ? rect.top - GAP_PX : below,
        transform: flipped ? 'translate(-50%, -100%)' : 'translateX(-50%)',
      }}
      role='status'
    >
      {blocked
        ? 'ここには置けません。位置をずらしてください'
        : 'キャンバスを動かすか枠をドラッグして位置を決めます'}
    </p>
  )
}
