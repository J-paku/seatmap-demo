import { FLOOR_NAME } from '@/lib/mock-loader'
import { triggerHaptic } from '@/lib/haptic'

type Props = {
  isSelected: boolean
  onSelect: () => void
}

// 展開パネル最上段: 公式レイアウトへ切り替えるボタン。選択中はaccent配色+右端checkで現在地を示す
export const OfficialLayoutButton = ({ isSelected, onSelect }: Props) => {
  return (
    <button
      type='button'
      className={`layout-switcher-official${isSelected ? ' is-selected' : ''}`}
      aria-pressed={isSelected}
      onClick={() => {
        triggerHaptic('light')
        onSelect()
      }}
    >
      <span className='icon-msr-filled layout-switcher-row-icon' aria-hidden='true'>
        apartment
      </span>
      <span className='layout-switcher-row-name'>{FLOOR_NAME}</span>
      {isSelected && (
        <span className='icon-msr-filled layout-switcher-row-check' aria-hidden='true'>
          check
        </span>
      )}
    </button>
  )
}
