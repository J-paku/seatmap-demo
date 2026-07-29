import type { Seat } from '@/types'

// 05: ジャンプ着地パルス。テキスト無し・クリック不可の矩形のみ(座席カード復活ではない)

type Props = {
  seat: Seat
}

export const JumpMarker = ({ seat }: Props) => (
  <div
    className='seat-jump-marker'
    aria-hidden='true'
    style={{ left: seat.x, top: seat.y, width: seat.width, height: seat.height }}
  />
)
