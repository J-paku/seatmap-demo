import type { LayoutMeta } from '@/types'
import type { LayoutSource } from '@/contexts/layout-source-context'
import { CustomLayoutRow } from './CustomLayoutRow'
import styles from '../layout-switcher.module.css'

type Props = {
  layoutMetas: LayoutMeta[]
  source: LayoutSource
  defaultLayoutId: string | null
  onSelect: (layoutId: string) => void
  onToggleDefault: (layoutId: string) => void
  onDelete: (layoutId: string) => void
}

// カスタムレイアウトの一覧。0件の時は区切り線ごと描かない(空の帯を残さないため)
export const CustomLayoutList = ({
  layoutMetas,
  source,
  defaultLayoutId,
  onSelect,
  onToggleDefault,
  onDelete,
}: Props) => {
  if (layoutMetas.length === 0) return null

  return (
    <div className={styles.customList}>
      {layoutMetas.map((meta) => (
        <CustomLayoutRow
          key={meta.layoutId}
          meta={meta}
          isSelected={source.type === 'custom' && source.layoutId === meta.layoutId}
          isDefault={defaultLayoutId === meta.layoutId}
          onSelect={onSelect}
          onToggleDefault={onToggleDefault}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
