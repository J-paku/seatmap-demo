import styles from '../team-overlay-modal.module.css'

// STEP D2: 回転グリップをドラッグしている間だけ出す方角ガイド。カード中心を基準に
// 東西南北の目安を薄く示し、ドラッグが終わればアンマウントされて消える(常時出すと
// グリッドが読めなくなるため)。装飾のみなのでaria-hidden、向きの文字情報は
// EditSeatCellのaria-labelが持つ
export const SeatCompassGuide = () => (
  <span className={styles.compassGuide} aria-hidden='true'>
    <span className={`${styles.compassTick} ${styles.isNorth}`} />
    <span className={`${styles.compassTick} ${styles.isEast}`} />
    <span className={`${styles.compassTick} ${styles.isSouth}`} />
    <span className={`${styles.compassTick} ${styles.isWest}`} />
  </span>
)
