// ポインタ列から得られる純粋な計算。状態は持たない

export type Point = { x: number; y: number }

// 2点の中点と距離
export const pinchGeometry = (a: Point, b: Point): { midX: number; midY: number; dist: number } => ({
  midX: (a.x + b.x) / 2,
  midY: (a.y + b.y) / 2,
  dist: Math.hypot(a.x - b.x, a.y - b.y),
})

// 直近サンプルの平均速度(慣性の初速)
export const averageVelocity = (samples: Array<{ x: number; y: number }>): Point => {
  if (samples.length === 0) return { x: 0, y: 0 }
  const sum = samples.reduce((acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }), { x: 0, y: 0 })
  return { x: sum.x / samples.length, y: sum.y / samples.length }
}

// 2点間の距離がしきい値を超えたか
export const movedBeyond = (from: Point, to: Point, threshold: number): boolean =>
  Math.hypot(to.x - from.x, to.y - from.y) > threshold
