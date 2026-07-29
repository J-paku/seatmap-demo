// 下スワイプで閉じるかどうかの判定。状態を持たない純粋計算

// 確定前の遊び幅(タップ・横スワイプと干渉させない)
export const SWIPE_SLOP = 10
// シート高 × この比率を超える下方向移動で閉じる
const CLOSE_RATIO = 0.28
// 移動量が足りなくてもこの速度を超えたら閉じる
const FLICK_SPEED = 0.7 // px/ms

export type SwipeSample = { y: number; t: number }

// 直近100msの下方速度
export const downwardFlick = (samples: SwipeSample[], now: number): number => {
  const recent = samples.filter((s) => now - s.t <= 100)
  if (recent.length < 2) return 0
  const a = recent[0]
  const b = recent[recent.length - 1]
  return (b.y - a.y) / Math.max(1, b.t - a.t)
}

// 追従量(スロップを引いた実移動量)
export const swipeOffset = (dy: number): number => Math.max(0, dy - SWIPE_SLOP)

// 閉じるべきか(移動量またはフリック速度のどちらかを満たせば閉じる)
export const shouldDismiss = (offset: number, sheetHeight: number, flick: number): boolean =>
  offset > sheetHeight * CLOSE_RATIO || flick > FLICK_SPEED
