import { FurnitureIcon } from './components/FurnitureIcon'
import { PickerSheet } from '@/components/PickerSheet'
import { FURNITURE_KIND_LABEL, FURNITURE_LIBRARY_GROUPS } from '@/utils/furniture-catalog'
import { triggerHaptic } from '@/utils/haptic'
import type { FurnitureKind } from '@/types'
import styles from '../object-picker.module.css'

// 置く家具の種別を選ぶ。選ぶとシートが閉じてゴーストが画面中央に出る

type Props = {
  isOpen: boolean
  onSelect: (kind: FurnitureKind) => void
  onClose: () => void
}

export const FurniturePickerModal = ({ isOpen, onSelect, onClose }: Props) => {
  // 選択確定の触覚。閉じ操作側(背景クリック・Esc・スワイプ)は PickerSheet の共通 onClose に
  // 一本化されているため、ここから個別の触覚を差し込むと閉じ経路すべてに二重発火してしまう
  const handleSelect = (kind: FurnitureKind) => {
    triggerHaptic('medium')
    onSelect(kind)
  }

  return (
    <PickerSheet
      isOpen={isOpen}
      title='家具を選択'
      note='選択すると画面中央に配置されます'
      onClose={onClose}
    >
      {FURNITURE_LIBRARY_GROUPS.map((group) => (
        <section key={group.label} className={styles.furnPickGroup}>
          <h3 className={styles.furnPickGroupTitle}>{group.label}</h3>
          <div className={styles.furnPickGrid}>
            {group.kinds.map((kind) => (
              <button
                key={kind}
                type='button'
                className={styles.furnPickCell}
                aria-label={`${FURNITURE_KIND_LABEL[kind]}を配置`}
                onClick={() => handleSelect(kind)}
              >
                <FurnitureIcon kind={kind} />
                <span className={styles.furnPickLabel}>{FURNITURE_KIND_LABEL[kind]}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </PickerSheet>
  )
}
