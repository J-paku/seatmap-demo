// スワイプ閉じ用: フリック速度トラッキング
// 直近サンプルから縦方向の速度（px/ms）を算出する純粋ヘルパー群

export interface VelocitySample {
  t: number
  y: number
}

// フリック速度算出に用いる直近サンプルの時間窓（ms）
const VELOCITY_SAMPLE_WINDOW_MS = 100

// 新しいサンプルを積み、時間窓を超えた古いサンプルを捨てる（配列を破壊的に更新）
export function pushVelocitySample(samples: VelocitySample[], sample: VelocitySample): void {
  samples.push(sample)
  while (samples.length > 0 && sample.t - samples[0].t > VELOCITY_SAMPLE_WINDOW_MS) {
    samples.shift()
  }
}

// 直近サンプルから縦方向のフリック速度（px/ms）を算出。サンプル不足・無効時は0
export function computeFlickVelocity(samples: VelocitySample[]): number {
  if (samples.length < 2) return 0
  const first = samples[0]
  const last = samples[samples.length - 1]
  const dt = last.t - first.t
  if (dt <= 0) return 0
  return (last.y - first.y) / dt
}
