import styles from '../team-overlay-modal.module.css'

// STEP B1: 編集中の空セル。破線枠+中央に薄い add_location_alt アイコンだけを描く。
// 席カードと高さを揃える必要があるため、寸法は呼び出し側のグリッド種別(Compact/Desktop)
// の CSS コンテキストに従って決まる(このコンポーネント自身は種別を知らない)
//
// §06-2: タップ=即座に席を追加する(選択→ピルタップの2段階は経由しない)。variant='firstSeat'は
// 0席チームの1×1グリッドにだけ渡し、文言を「最初の席を追加」に変える。通常(default)は
// aria-labelのみで可視テキストを持たないため、この variant だけ可視ラベルを添えて発見しやすくする

type Props = {
  variant?: 'default' | 'firstSeat'
  onAdd: () => void
}

const DEFAULT_LABEL = '席追加'
const FIRST_SEAT_LABEL = '最初の席を追加'

export const EmptyGridCell = ({ variant = 'default', onAdd }: Props) => {
  const isFirstSeat = variant === 'firstSeat'
  const label = isFirstSeat ? FIRST_SEAT_LABEL : DEFAULT_LABEL
  return (
    <button
      type='button'
      className={`${styles.emptycell}${isFirstSeat ? ` ${styles.isFirstSeat}` : ''}`}
      aria-label={label}
      onClick={onAdd}
    >
      <span className={`material-symbols-outlined ${styles.emptycellIcon}`} aria-hidden='true'>
        add_location_alt
      </span>
      {isFirstSeat && <span className={styles.emptycellLabel}>{label}</span>}
    </button>
  )
}
