import { FurnitureIcon } from './components/FurnitureIcon'
import { PickerSheet } from '@/components/PickerSheet'
import { FURNITURE_KIND_LABEL, FURNITURE_LIBRARY_GROUPS } from '@/utils/furniture-catalog'
import type { FurnitureKind } from '@/types'

// 置く家具の種別を選ぶ。選ぶとシートが閉じてゴーストが画面中央に出る

type Props = {
  isOpen: boolean
  onSelect: (kind: FurnitureKind) => void
  onClose: () => void
}

export const FurniturePickerModal = ({ isOpen, onSelect, onClose }: Props) => (
  <PickerSheet
    isOpen={isOpen}
    title='家具を選ぶ'
    note='選択すると画面中央に配置されます'
    onClose={onClose}
  >
    {FURNITURE_LIBRARY_GROUPS.map((group) => (
      <section key={group.label} className='furn-pick-group'>
        <h3 className='furn-pick-group-title'>{group.label}</h3>
        <div className='furn-pick-grid'>
          {group.kinds.map((kind) => (
            <button key={kind} type='button' className='furn-pick-cell' onClick={() => onSelect(kind)}>
              <FurnitureIcon kind={kind} />
              <span className='furn-pick-label'>{FURNITURE_KIND_LABEL[kind]}</span>
            </button>
          ))}
        </div>
      </section>
    ))}
  </PickerSheet>
)
