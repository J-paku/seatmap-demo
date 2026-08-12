import styles from '../ghost-placement.module.css'

// フロア(viewBox)境界の可視化。キャンバスはフロアの外側まで同じ背景で見えるため、
// これが無いと「余白に見えるがフロア外」を利用者が判別できない。
// 外側の一様なシェードは巨大 outline 1枚で表現する(4分割矩形より単純で隙間も出ない)。
// フロア外が置けない理由になっている間は境界を危険色へ切り替えて相手を指す
type Props = {
  rect: { left: number; top: number; width: number; height: number }
  isBlocking: boolean
}

export const GhostFloorBoundary = ({ rect, isBlocking }: Props) => (
  <div
    className={`${styles.floorBoundary}${isBlocking ? ` ${styles.isBlocking}` : ''}`}
    style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
    aria-hidden='true'
  />
)
