import { Fragment } from 'react'
import { PickerSheet } from '@/components/PickerSheet'
import { triggerHaptic } from '@/utils/haptic'
import styles from '../object-picker.module.css'

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
  { category: 'furniture', icon: 'chair', title: '家具', description: '建設設備・家具を配置' },
  { category: 'facility', icon: 'meeting_room', title: '施設', description: 'Garoon会議室を配置' },
]

// §03-1: Garoon 未接続のとき施設タイルの下に出す脚注
const GAROON_OFFLINE_NOTE = 'Garoonにログインすると施設を配置できます'

type Props = {
  isOpen: boolean
  // 出したい分類だけを渡す。PHASE ごとに増える導線をここで足し引きする
  categories: readonly ObjectCategory[]
  // §03-1: Garoon 未接続なら施設タイルを押させず、脚注で理由を出す
  isGaroonConnected: boolean
  onSelect: (category: ObjectCategory) => void
  onClose: () => void
}

export const ObjectCategorySheet = ({ isOpen, categories, isGaroonConnected, onSelect, onClose }: Props) => (
  <PickerSheet isOpen={isOpen} title='オブジェクトを追加' onClose={onClose}>
    <div className={styles.objCatList}>
      {CARDS.filter((card) => categories.includes(card.category)).map((card) => {
        const isDisabled = card.category === 'facility' && !isGaroonConnected
        return (
          <Fragment key={card.category}>
            <button
              type='button'
              className={styles.objCatCard}
              disabled={isDisabled}
              onClick={() => {
                // 1段目が無反応・2段目が強反応という食い違いを無くす(家具タイルと同じ medium)
                triggerHaptic('medium')
                onSelect(card.category)
              }}
            >
              <span className={`icon-msr-thin ${styles.objCatIcon}`} aria-hidden='true'>
                {card.icon}
              </span>
              <span className={styles.objCatText}>
                <span className={styles.objCatTitle}>{card.title}</span>
                <span className={styles.objCatDesc}>{card.description}</span>
              </span>
            </button>
            {isDisabled && <p className={styles.objCatNote}>{GAROON_OFFLINE_NOTE}</p>}
          </Fragment>
        )
      })}
    </div>
  </PickerSheet>
)
