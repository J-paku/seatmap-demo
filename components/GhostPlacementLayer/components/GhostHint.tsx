import type { PointerEvent as ReactPointerEvent } from 'react'
import { clamp } from '@/utils/layout/geometry'
import styles from '../ghost-placement.module.css'
// ヒント文言。ゴーストの直下に出し、画面下端に近いときは上へ反転する。
// 外箱が位置と操作(掴み)を持ち、内ピルが塗りとパルスを持つ2層構造 —
// 1層のままポインタを通さないと、チップの上に置いた指が下のキャンバスへ抜けて地図がパンする

// 反転に切り替える下端からの距離(§04-2: 画面下端110px圏内)
const FLIP_MARGIN_PX = 110
const GAP_PX = 12
// 左右の画面端からの最小余白(§04-2: 左右80pxクランプ)
const EDGE_CLAMP_PX = 80

type Props = {
  rect: { left: number; top: number; width: number; height: number }
  blocked: boolean
  // 掴んでいる間は位置の遷移とパルスを止める
  isDragging: boolean
  onPointerDown: (e: ReactPointerEvent) => void
}

export const GhostHint = ({ rect, blocked, isDragging, onPointerDown }: Props) => {
  const below = rect.top + rect.height + GAP_PX
  // しきい値は隙間を2回数える。1回だと下端でアクションバーの裏へ一瞬もぐってから反転する
  const flipped = rect.top + rect.height + GAP_PX * 2 > window.innerHeight - FLIP_MARGIN_PX
  const centerX = clamp(rect.left + rect.width / 2, EDGE_CLAMP_PX, window.innerWidth - EDGE_CLAMP_PX)
  return (
    <div
      className={`${styles.hintBox}${isDragging ? ` ${styles.isDragging}` : ''}`}
      style={{
        left: centerX,
        top: flipped ? rect.top - GAP_PX : below,
        transform: flipped ? 'translate(-50%, -100%)' : 'translateX(-50%)',
      }}
      onPointerDown={onPointerDown}
      data-ghost='hint'
      data-flipped={flipped ? 'true' : 'false'}
    >
      <span
        className={`${styles.hint}${blocked ? ` ${styles.isBlocked}` : ''}${isDragging ? ` ${styles.isDragging}` : ''}`}
      >
        <span className='material-symbols-outlined' aria-hidden='true'>
          {blocked ? 'block' : 'drag_pan'}
        </span>
        {/* アイコンのリガチャ文字が読み上げと textContent に混ざらないよう、状態領域は文言だけを包む */}
        <span role='status' aria-live='polite'>
          {blocked ? '赤い枠と重なっています' : 'ドラッグで移動'}
        </span>
      </span>
    </div>
  )
}
