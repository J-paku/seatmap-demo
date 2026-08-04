import { PickerSheet } from '@/components/PickerSheet'

// 何を置くかの大分類。チームは PHASE D で先頭に足す想定

export type ObjectCategory = 'team' | 'furniture' | 'facility'

type CategoryCard = {
  category: ObjectCategory
  icon: string
  title: string
  description: string
}

const CARDS: readonly CategoryCard[] = [
  { category: 'team', icon: 'groups', title: 'チーム', description: '部署の区画を新しく作ります' },
  { category: 'furniture', icon: 'chair', title: '家具', description: '壁・柱・ソファなどを置きます' },
  { category: 'facility', icon: 'meeting_room', title: '会議室', description: '会議室や応接室を置きます' },
]

type Props = {
  isOpen: boolean
  // 出したい分類だけを渡す。PHASE ごとに増える導線をここで足し引きする
  categories: readonly ObjectCategory[]
  onSelect: (category: ObjectCategory) => void
  onClose: () => void
}

export const ObjectCategorySheet = ({ isOpen, categories, onSelect, onClose }: Props) => (
  <PickerSheet isOpen={isOpen} title='何を置きますか' onClose={onClose}>
    <div className='obj-cat-list'>
      {CARDS.filter((card) => categories.includes(card.category)).map((card) => (
        <button
          key={card.category}
          type='button'
          className='obj-cat-card'
          onClick={() => onSelect(card.category)}
        >
          <span className='icon-msr-thin obj-cat-icon' aria-hidden='true'>
            {card.icon}
          </span>
          <span className='obj-cat-text'>
            <span className='obj-cat-title'>{card.title}</span>
            <span className='obj-cat-desc'>{card.description}</span>
          </span>
        </button>
      ))}
    </div>
  </PickerSheet>
)
