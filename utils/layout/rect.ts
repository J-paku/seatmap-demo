// 矩形の基本演算。編集モードの当たり判定と配置計算が共通で使う
import { clamp } from './geometry'

export type Rect = { x: number; y: number; w: number; h: number }

// §04-1: ゴーストの表示寸法の上限・下限(画面px)。
// 上限は画面を覆い隠さないため、下限はタッチ標的(44px)を割らないため
const GHOST_DISPLAY_MAX = { width: 200, height: 140 }
const GHOST_DISPLAY_MIN = 44

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

// §04-1: ゴーストの表示寸法。実寸×scale を「最大200×140へ縮小・最小44pxへ拡大」に収める。
// 縦横は独立に丸める(仕様の上限が軸ごとの2値、下限が両軸共通の1値である形をそのまま写す)。
// 論理矩形(実際に置かれる大きさ)は変えない。ここで決まるのは画面上の見た目だけ
export const clampGhostDisplaySize = (size: { width: number; height: number }) => ({
  width: clamp(size.width, GHOST_DISPLAY_MIN, GHOST_DISPLAY_MAX.width),
  height: clamp(size.height, GHOST_DISPLAY_MIN, GHOST_DISPLAY_MAX.height),
})

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
