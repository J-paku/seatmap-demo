import styles from '../team-overlay-modal.module.css'

// STEP B1: 編集中の空セル。破線枠+中央に薄い add アイコンだけを描く。
// 席カードと高さを揃える必要があるため、寸法は呼び出し側のグリッド種別(Compact/Desktop)
// の CSS コンテキストに従って決まる(このコンポーネント自身は種別を知らない)

type Props = {
  isSelected: boolean
  onSelect: () => void
}

export const EmptyGridCell = ({ isSelected, onSelect }: Props) => (
  <button
    type='button'
    className={`${styles.emptycell}${isSelected ? ` ${styles.isSelected}` : ''}`}
    aria-label='空セルを選択'
    onClick={onSelect}
  >
    <span className={`material-symbols-outlined ${styles.emptycellIcon}`} aria-hidden='true'>
      add
    </span>
  </button>
)
