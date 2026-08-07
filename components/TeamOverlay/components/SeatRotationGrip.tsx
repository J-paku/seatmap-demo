import { useSeatRotationGrip } from '../hooks/use-seat-rotation-grip'
import type { Seat } from '@/types'

// STEP D1: 編集中·選択中の席カード左上に出す回転グリップ。タップで時計回りに1段、
// ドラッグで方角にスナップする。挙動そのものはuse-seat-rotation-gripへ委譲し、ここは配線のみ

type Props = {
  seatId: string
  rotation: Seat['rotation']
  onRotate: (seatId: string, rotation: Seat['rotation']) => void
}

export const SeatRotationGrip = ({ seatId, rotation, onRotate }: Props) => {
  const gripProps = useSeatRotationGrip({ seatId, rotation, onRotate })
  return (
    <button
      type='button'
      className='team-ovl-rotation-grip'
      aria-label='座席の向きを回転'
      {...gripProps}
    >
      <span className='material-symbols-outlined team-ovl-rotation-grip-icon' aria-hidden='true'>
        rotate_right
      </span>
    </button>
  )
}
