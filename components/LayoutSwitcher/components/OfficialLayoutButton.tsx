import { FLOOR_NAME } from '@/lib/mock-loader'
import { triggerHaptic } from '@/lib/haptic'
import styles from '../layout-switcher.module.css'

type Props = {
  isSelected: boolean
  onSelect: () => void
}

// 展開パネル最上段: 公式レイアウトへ切り替えるボタン。選択中はaccent配色+右端checkで現在地を示す
export const OfficialLayoutButton = ({ isSelected, onSelect }: Props) => {
  return (
    <button
      type='button'
      className={`${styles.official}${isSelected ? ` ${styles.isSelected}` : ''}`}
      aria-pressed={isSelected}
      onClick={() => {
        triggerHaptic('light')
        onSelect()
      }}
    >
      <span className={`icon-msr-filled ${styles.rowIcon}`} aria-hidden='true'>
        apartment
      </span>
      <span className={styles.rowName}>{FLOOR_NAME}</span>
      {isSelected && (
        <span className={`icon-msr-filled ${styles.rowCheck}`} aria-hidden='true'>
          check
        </span>
      )}
    </button>
  )
}
