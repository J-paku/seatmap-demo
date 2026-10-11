import type { CoachMarkTourState } from '../type'

// 「再生中」= 分岐カードが立っているか、ステップが立っている状態。
// 表示判定(FABの可否・ツアー層の重複防止)が同じ式を2箇所で持たないようここに置く
export const isTourPlaying = (tour: Pick<CoachMarkTourState, 'isBranching' | 'step'>): boolean =>
  tour.isBranching || tour.step !== null
