// 矩形の基本演算。編集モードの当たり判定と配置計算が共通で使う

export type Rect = { x: number; y: number; w: number; h: number }

// ゴーストの表示寸法の下限(画面px)。タッチ標的(44px)を割らないため。
// 上限クランプは廃止した — 表示を実寸より縮めると「見た目は重なっていないのに
// 判定は重なっている」が起き、置けない理由が利用者から見えなくなる
const GHOST_DISPLAY_MIN = 44

// 実物由来のゴースト最小辺(viewBox 単位)。配置・リサイズの下限が共有する
export const GHOST_MIN_SIZE = 40

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

// 内側へ縮めた矩形。寸法が尽きたら中心で潰す(負の幅にすると交差判定が反転する)
export const insetRect = (r: Rect, by: number): Rect => ({
  x: r.x + Math.min(by, r.w / 2),
  y: r.y + Math.min(by, r.h / 2),
  w: Math.max(r.w - by * 2, 0),
  h: Math.max(r.h - by * 2, 0),
})

// ゴーストの表示寸法。実寸×scale をそのまま使い、最小44pxだけ保証する。
// 表示=当たり判定の等尺が原則(縮めると衝突が見えない)。論理矩形は変えない
export const clampGhostDisplaySize = (size: { width: number; height: number }) => ({
  width: Math.max(size.width, GHOST_DISPLAY_MIN),
  height: Math.max(size.height, GHOST_DISPLAY_MIN),
})

// 点(座標)が矩形内部にあるか
export const pointInRect = (px: number, py: number, r: Rect): boolean =>
  px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h

// viewBox 全域クランプ
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
