import { SEAT_DIRECTION } from '../utils/seat-direction'
import { hexToRgba } from '@/utils/color'
import type { Seat } from '@/types'

// STEP D2: 編集中の席カードの縁のうち、その席が向いている辺だけに短い帯を出す。
// 矢印アイコンにはしない(小さいカードでは潰れて読めないため)。チーム色は呼び出し側から
// 受け取った解決済みの値をそのまま薄めるだけで、ここでは再解決しない。
// 装飾のみなのでaria-hidden、向きの文字情報はEditSeatCellのaria-labelが持つ

type Props = {
  rotation: Seat['rotation']
  teamColor: string
}

export const SeatDirectionMarker = ({ rotation, teamColor }: Props) => (
  <span
    aria-hidden='true'
    className={`team-ovl-dir-marker is-edge-${SEAT_DIRECTION[rotation]}`}
    style={{ background: hexToRgba(teamColor, 0.55) }}
  />
)
