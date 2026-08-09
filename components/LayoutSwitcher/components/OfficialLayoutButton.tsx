import type { Floor } from '@/types'
import { triggerHaptic } from '@/utils/haptic'
import styles from '../layout-switcher.module.css'

type Props = {
  floor: Floor
  isSelected: boolean
  onSelect: (floorId: string) => void
}

// 展開パネル最上段: 公式レイアウト(フロア)1件へ切り替えるボタン。フロアの数だけ並ぶ。
// 選択中はaccent配色+右端checkで現在地を示す
export const OfficialLayoutButton = ({ floor, isSelected, onSelect }: Props) => {
  return (
    <button
      type='button'
      className={`${styles.official}${isSelected ? ` ${styles.isSelected}` : ''}`}
      aria-pressed={isSelected}
      onClick={() => {
        triggerHaptic('light')
        onSelect(floor.floorId)
      }}
    >
      <span className={`icon-msr-filled ${styles.rowIcon}`} aria-hidden='true'>
        apartment
      </span>
      <span className={styles.rowName}>{floor.floorName}</span>
      {isSelected && (
        <span className={`icon-msr-filled ${styles.rowCheck}`} aria-hidden='true'>
          check
        </span>
      )}
    </button>
  )
}
