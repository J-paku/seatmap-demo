// 直近100msの速度からフリック量を求める
export const flickSpeed = (samples: Array<{ x: number; t: number }>, now: number): number => {
  const recent = samples.filter(s => now - s.t <= 100)
  if (recent.length < 2) return 0
  const a = recent[0]
  const b = recent[recent.length - 1]
  return (b.x - a.x) / Math.max(1, b.t - a.t)
}
