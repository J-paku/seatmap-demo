import { CompactSeatGrid } from './CompactSeatGrid'
import { DesktopSeatGrid } from './DesktopSeatGrid'
import type { SeatGridProps } from '@/lib/seat-grid'

// props は共通だが、描画・入力・スクロール戦略はすべて別実装

type Props = SeatGridProps & {
  isCompactMobile: boolean
}

export const SeatGridFrame = ({ isCompactMobile, ...gridProps }: Props) =>
  isCompactMobile ? <CompactSeatGrid {...gridProps} /> : <DesktopSeatGrid {...gridProps} />
