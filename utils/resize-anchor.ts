// 8方向リサイズ。掴んだハンドルの反対側エッジをアンカーとして固定し、制御軸だけを伸縮させる。
// 純粋計算なので、どの座標系(viewBox / 画面px)で呼んでも成立する
import { clamp } from './geometry'
import type { Rect } from './rect'

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export const RESIZE_HANDLES: readonly ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

// dx / dy は掴んでからの移動量。非制御軸は現状を維持する
export const resizeRect = (
  rect: Rect,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  min: number,
  max: number
): Rect => {
  let { x, y, w, h } = rect

  if (handle.includes('e')) {
    w = clamp(rect.w + dx, min, max)
  } else if (handle.includes('w')) {
    w = clamp(rect.w - dx, min, max)
    // 右エッジをアンカーにするので、幅が縮んだぶんだけ左へ戻す
    x = rect.x + rect.w - w
  }

  if (handle.includes('s')) {
    h = clamp(rect.h + dy, min, max)
  } else if (handle.includes('n')) {
    h = clamp(rect.h - dy, min, max)
    y = rect.y + rect.h - h
  }

  return { x, y, w, h }
}
