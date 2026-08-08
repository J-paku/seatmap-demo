import { SeatMapPortal } from '@/components/SeatMapPortal'
import styles from '../team-overlay-modal.module.css'

// STEP B2: タッチドラッグ中に指へ追従するゴースト。SeatMapPortal で body 直下へ描き、
// グリッドの overflow に切られないようにする。マウスは HTML5 DnD のネイティブなドラッグ画像に
// 任せるためこの見た目はタッチ経路専用。呼び出し側は指のドラッグ中(touchGhostPosition が
// 非nullの間)だけこのコンポーネントをマウントする

type Props = {
  x: number
  y: number
}

export const SeatDragGhost = ({ x, y }: Props) => (
  <SeatMapPortal>
    <div className={styles.seatDragGhost} style={{ left: x, top: y }} aria-hidden='true'>
      <span className={`material-symbols-outlined ${styles.seatDragGhostIcon}`} aria-hidden='true'>
        drag_indicator
      </span>
    </div>
  </SeatMapPortal>
)
