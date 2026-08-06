import type { LayoutMeta } from '@/types'
import { triggerHaptic } from '@/lib/haptic'

type Props = {
  meta: LayoutMeta
  isSelected: boolean
  isDefault: boolean
  onSelect: (layoutId: string) => void
  onToggleDefault: (layoutId: string) => void
  onDelete: (layoutId: string) => void
}

// カスタムレイアウト1件の行。名前ボタンで選択、星でデフォルト設定、×で削除する。
// 星・削除の実処理はSTEP5が担当するため、ここではpropsで受け取った呼び出し口を鳴らすだけ
export const CustomLayoutRow = ({
  meta,
  isSelected,
  isDefault,
  onSelect,
  onToggleDefault,
  onDelete,
}: Props) => {
  return (
    <div className={`layout-switcher-custom-row${isSelected ? ' is-selected' : ''}`}>
      <button
        type='button'
        className='layout-switcher-row-name-button'
        aria-pressed={isSelected}
        onClick={() => {
          triggerHaptic('light')
          onSelect(meta.layoutId)
        }}
      >
        <span className='layout-switcher-row-name'>{meta.layoutName}</span>
        {isSelected && (
          <span className='icon-msr-filled layout-switcher-row-check' aria-hidden='true'>
            check
          </span>
        )}
      </button>
      <button
        type='button'
        className='layout-switcher-star-button'
        aria-label={`${meta.layoutName}${isDefault ? 'のデフォルトを解除' : 'をデフォルトに設定'}`}
        onClick={() => onToggleDefault(meta.layoutId)}
      >
        <span
          className={`icon-msr-filled layout-switcher-star-icon${isDefault ? ' is-default' : ''}`}
          aria-hidden='true'
        >
          star
        </span>
      </button>
      <button
        type='button'
        className='layout-switcher-delete-button'
        aria-label={`${meta.layoutName}を削除`}
        onClick={() => onDelete(meta.layoutId)}
      >
        <span className='icon-msr-filled layout-switcher-delete-icon' aria-hidden='true'>
          close
        </span>
      </button>
    </div>
  )
}
