import type { UndoChipRequest, UndoChipView } from '../type'
import type { Transform } from '@/utils/layout/geometry'

export const DISMISS_MS = 4000
// 対象下端とチップの隙間。画面px固定で、倍率に依らない(投影の後に足す)
const ANCHOR_GAP_PX = 10

export const project = (req: UndoChipRequest, t: Transform): UndoChipView => ({
  // ANCHOR_GAP_PX が t.scale の外にあることが要点。掛けると隙間が倍率で伸縮する
  chip: {
    x: req.anchor.x * t.scale + t.translateX,
    y: req.anchor.y * t.scale + t.translateY + ANCHOR_GAP_PX,
  },
  frame: req.frame
    ? {
        x: req.frame.x * t.scale + t.translateX,
        y: req.frame.y * t.scale + t.translateY,
        w: req.frame.w * t.scale,
        h: req.frame.h * t.scale,
      }
    : null,
})

// 変換が動いていないフレームで再レンダーを起こさない。同じ変換なら数値は完全一致する
export const isSameView = (a: UndoChipView | null, b: UndoChipView): boolean =>
  a !== null &&
  a.chip.x === b.chip.x &&
  a.chip.y === b.chip.y &&
  // フレームは片方でも無ければ両方無いときだけ同じ。両方あるときだけ値で比べる
  (a.frame === null || b.frame === null
    ? a.frame === b.frame
    : a.frame.x === b.frame.x &&
      a.frame.y === b.frame.y &&
      a.frame.w === b.frame.w &&
      a.frame.h === b.frame.h)
