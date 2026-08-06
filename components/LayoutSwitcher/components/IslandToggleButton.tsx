import type { LayoutSource } from '@/contexts/layout-source-context'
import type { LayoutMeta } from '@/types'
import { FLOOR_NAME } from '@/lib/mock-loader'
import { triggerHaptic } from '@/lib/haptic'

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
    ? (layoutMetas.find((meta) => meta.layoutId === source.layoutId)?.layoutName ?? FLOOR_NAME)
    : FLOOR_NAME

  return (
    <button
      type='button'
      className={`layout-switcher-toggle${isOpen ? ' is-open' : ''}`}
      aria-expanded={isOpen}
      aria-controls={panelId}
      onClick={() => {
        triggerHaptic('light')
        onToggle()
      }}
    >
      <span
        className={`icon-msr-filled layout-switcher-toggle-icon${isCustom ? ' is-custom' : ''}`}
        aria-hidden='true'
      >
        {isCustom ? 'grid_view' : 'apartment'}
      </span>
      <span className='layout-switcher-toggle-name'>{currentName}</span>
      <span className='icon-msr-filled layout-switcher-toggle-caret' aria-hidden='true'>
        expand_more
      </span>
    </button>
  )
}
