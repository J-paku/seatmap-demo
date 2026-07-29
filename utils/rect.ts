// 矩形の基本演算。編集モードの当たり判定と配置計算が共通で使う

export type Rect = { x: number; y: number; w: number; h: number }

// 対象オブジェクトの矩形(rotation は判定に加味しない=AABB)
export const rectOf = (o: { x: number; y: number; width: number; height: number }): Rect => ({
  x: o.x,
  y: o.y,
  w: o.width,
  h: o.height,
})

// 2矩形の交差判定(接触=非交差)
export const rectsIntersect = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

// 点(座標)が矩形内部にあるか
export const pointInRect = (px: number, py: number, r: Rect): boolean =>
  px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h

// viewBox 全域クランプ(ドラッグ中常時)
export const clampRectToViewBox = (r: Rect, viewW: number, viewH: number): Rect => ({
  x: Math.min(Math.max(r.x, 0), viewW - r.w),
  y: Math.min(Math.max(r.y, 0), viewH - r.h),
  w: r.w,
  h: r.h,
})

// 矩形群のバウンディングボックス
export const boundingBoxOf = (rects: Rect[]): Rect | null => {
  if (rects.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const r of rects) {
    minX = Math.min(minX, r.x)
    minY = Math.min(minY, r.y)
    maxX = Math.max(maxX, r.x + r.w)
    maxY = Math.max(maxY, r.y + r.h)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}
