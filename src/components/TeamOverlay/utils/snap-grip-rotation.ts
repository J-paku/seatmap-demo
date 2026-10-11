import type { Seat } from '@/types'

// ドラッグ扱いに切り替わる移動距離のしきい値(px)
export const DRAG_DEAD_ZONE_PX = 12

const ROTATION_VALUES: Seat['rotation'][] = [0, 90, 180, 270]

// タップ1回ぶんの時計回り。0→90→180→270→0
export const CLOCKWISE_NEXT: Record<Seat['rotation'], Seat['rotation']> = {
  0: 90,
  90: 180,
  180: 270,
  270: 0,
}

// pointerdown位置からの移動量(画面座標·y下向き)を方角へスナップする。
// 右=東=90 / 下=南=0 / 左=西=270 / 上=北=180。数学の角度(atan2は0=右·90=下·180/-180=左·-90=上)を
// そのまま回転値にすると南北が入れ替わるため、「90 - 角度」で基準(0=南)へ変換してから90度刻みへ丸める
export const angleToRotation = (dx: number, dy: number): Seat['rotation'] => {
  const screenAngleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
  // 角度を先に0〜360へ直さなくても、「90 - 角度」の剰余を正へ寄せれば0〜360に収まる
  const continuous = (((90 - screenAngleDeg) % 360) + 360) % 360
  const index = Math.round(continuous / 90) % ROTATION_VALUES.length
  return ROTATION_VALUES[index]
}
