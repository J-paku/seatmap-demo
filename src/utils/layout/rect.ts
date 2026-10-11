// 矩形の基本演算。編集モードの当たり判定と配置計算が共通で使う
import { clamp } from './geometry'

export type Rect = { x: number; y: number; w: number; h: number }

// ゴーストの表示寸法の下限(画面px)。タッチ標的(44px)を割らないため。
// 上限クランプは廃止した — 表示を実寸より縮めると「見た目は重なっていないのに
// 判定は重なっている」が起き、置けない理由が利用者から見えなくなる
const GHOST_DISPLAY_MIN = 44

// 実物由来のゴースト最小辺(viewBox 単位)。配置・リサイズの下限が共有する
export const GHOST_MIN_SIZE = 40

// 回転を見ない素のAABB。回転を持つ対象は rotatedRectOf を使う
export const rectOf = (o: { x: number; y: number; width: number; height: number }): Rect => ({
  x: o.x,
  y: o.y,
  w: o.width,
  h: o.height,
})

// 回転込みの矩形。90/270 は中心を保ったまま w/h を交換する(0/180 と未指定は素の箱)。
// 衝突判定と吸着候補が同じ1本を通ることが要点 — 別々に持つと、片方だけ回転を
// 見落としても型では落ちず、ガイドだけが実物から離れた場所に出る
export const rotatedRectOf = (o: {
  x: number
  y: number
  width: number
  height: number
  rotation?: 0 | 90 | 180 | 270
}): Rect => {
  if (o.rotation !== 90 && o.rotation !== 270) return rectOf(o)
  const cx = o.x + o.width / 2
  const cy = o.y + o.height / 2
  return { x: cx - o.height / 2, y: cy - o.width / 2, w: o.height, h: o.width }
}

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

// ゴーストの表示寸法。実寸×scale(=フットプリント)をそのまま使い、短辺が 44px を割るときだけ
// 両軸へ同じ倍率を掛けて持ち上げる。軸ごとに別々へ引き上げると縦横比が壊れ、
// 描かれた箱が実物と別の形になる。上限クランプは設けない —
// 表示を実寸より縮めると「見た目は重なっていないのに置けない」が起き、理由が見えなくなる
export const ghostDisplaySize = (footprint: { width: number; height: number }) => {
  const shorter = Math.min(footprint.width, footprint.height)
  // 面積が無い矩形には保つべき縦横比が無い。0除算を作らないための退避
  if (shorter <= 0) return { width: GHOST_DISPLAY_MIN, height: GHOST_DISPLAY_MIN }
  const grow = Math.max(1, GHOST_DISPLAY_MIN / shorter)
  return { width: footprint.width * grow, height: footprint.height * grow }
}

// ゴースト中心をキャンバス矩形の内側へ収める。半径はフットプリントの半分そのままで、
// キャンバス寸法で頭打ちにしない — フットプリントがキャンバスより大きいと下限が上限を
// 追い越し、clamp の Math.min 側が勝って「右辺・下辺が端に貼り付いて止まる」に落ちる。
// 中央へ寄せ直す動きは入れない(掴んだ位置から勝手に離れる)
export const clampGhostCenter = (
  center: { x: number; y: number },
  canvas: { left: number; top: number; right: number; bottom: number },
  footprint: { width: number; height: number }
) => ({
  x: clamp(center.x, canvas.left + footprint.width / 2, canvas.right - footprint.width / 2),
  y: clamp(center.y, canvas.top + footprint.height / 2, canvas.bottom - footprint.height / 2),
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
