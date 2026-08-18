// 8方向リサイズ。掴んだハンドルの反対側エッジをアンカーとして固定し、制御軸だけを伸縮させる。
// 純粋計算なので、どの座標系(viewBox / 画面px)で呼んでも成立する
import { clamp } from './geometry'
import type { Rect } from './rect'

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export const RESIZE_HANDLES: readonly ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export type ResizeLimits = { minW: number; minH: number; max: number }

// 掴んだハンドルの対辺をアンカーとして固定し、アンカーからポインタまでの「絶対距離」を
// 制御軸の寸法にする。差分加算ではないので、掴んだ瞬間の指と辺のズレは最初の1移動で吸収され、
// アンカーを跨いで引くと箱は反対側へ回り込まず同じ側で鏡像に伸び直す。
// 座標系は論理(viewBox)で受ける — ジェスチャー中にピンチが入ってもアンカーの論理位置は動かない。
// 最小値を軸ごとに持つのは、会議室が座席1つ分(105×75)を下回らないようにするため
export const resizeRectToPointer = (
  rect: Rect,
  handle: ResizeHandle,
  pointer: { x: number; y: number },
  limits: ResizeLimits
): Rect => {
  const { minW, minH, max } = limits
  let { x, y, w, h } = rect

  if (handle.includes('e')) {
    // 西辺がアンカー。東へ引いても西へ跨いでも、幅はアンカーからの距離そのもの
    const ax = rect.x
    w = clamp(Math.abs(pointer.x - ax), minW, max)
    x = ax
  } else if (handle.includes('w')) {
    // 東辺がアンカー。原点はアンカーから幅ぶん戻した位置
    const ax = rect.x + rect.w
    w = clamp(Math.abs(ax - pointer.x), minW, max)
    x = ax - w
  }

  if (handle.includes('s')) {
    const ay = rect.y
    h = clamp(Math.abs(pointer.y - ay), minH, max)
    y = ay
  } else if (handle.includes('n')) {
    const ay = rect.y + rect.h
    h = clamp(Math.abs(ay - pointer.y), minH, max)
    y = ay - h
  }

  return { x, y, w, h }
}
