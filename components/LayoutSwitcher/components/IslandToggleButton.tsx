import type { LayoutSource } from '@/contexts/layout-source-context'
import type { LayoutMeta } from '@/types'
import { DEFAULT_FLOOR_ID, floorNameOf } from '@/utils/floors'
import { triggerHaptic } from '@/lib/haptic'
import styles from '../layout-switcher.module.css'

type Props = {
  source: LayoutSource
  layoutMetas: LayoutMeta[]
  isOpen: boolean
  panelId: string
  onToggle: () => void
}

// アイランド本体のトグルボタン。公式/カスタムでアイコンと現在名だけ出し分け、
// 展開状態はis-openクラスとaria-expandedで外へ伝える(morph自体はCSS側が担う)
export const IslandToggleButton = ({ source, layoutMetas, isOpen, panelId, onToggle }: Props) => {
  const isCustom = source.type === 'custom'
  const currentName = isCustom
    ? (layoutMetas.find((meta) => meta.layoutId === source.layoutId)?.layoutName ??
      floorNameOf(DEFAULT_FLOOR_ID))
    : floorNameOf(source.floorId)

  return (
    <button
      type='button'
      className={`${styles.toggle}${isOpen ? ` ${styles.isOpen}` : ''}`}
      aria-expanded={isOpen}
      aria-controls={panelId}
      onClick={() => {
        triggerHaptic('light')
        onToggle()
      }}
    >
      <span
        className={`icon-msr-filled ${styles.toggleIcon}${isCustom ? ` ${styles.isCustom}` : ''}`}
        aria-hidden='true'
      >
        {isCustom ? 'grid_view' : 'apartment'}
      </span>
      <span className={styles.toggleName}>{currentName}</span>
      <span className={`icon-msr-filled ${styles.toggleCaret}`} aria-hidden='true'>
        expand_more
      </span>
    </button>
  )
}
