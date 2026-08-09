import { useSeatRotationGrip } from '../hooks/use-seat-rotation-grip'
import styles from '../team-overlay-modal.module.css'
import type { Seat } from '@/types'

// STEP D1: 編集中·選択中の席カード左上に出す回転グリップ。タップで時計回りに1段、
// ドラッグで方角にスナップする。挙動そのものはuse-seat-rotation-gripへ委譲し、ここは配線のみ

type Props = {
  seatId: string
  rotation: Seat['rotation']
  onRotate: (seatId: string, rotation: Seat['rotation']) => void
  // STEP D2: ドラッグ中フラグを親(EditSeatCell)へ出す。コンパスガイドの表示切り替えに使う
  onDraggingChange: (dragging: boolean) => void
}

export const SeatRotationGrip = ({ seatId, rotation, onRotate, onDraggingChange }: Props) => {
  const gripProps = useSeatRotationGrip({ seatId, rotation, onRotate, onDraggingChange })
  return (
    <button
      type='button'
      className={styles.rotationGrip}
      aria-label='座席の向きを回転'
      {...gripProps}
    >
      <span className='material-symbols-outlined' aria-hidden='true'>
        rotate_right
      </span>
    </button>
  )
}
