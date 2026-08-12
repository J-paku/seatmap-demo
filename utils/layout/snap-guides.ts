// 07-admin-edit: 整列スナップ(ドラッグ中のエッジ・中心線吸着)計算
import { clamp } from './geometry'
import type { Rect } from './rect'
import type { ResizeHandle, ResizeLimits } from './resize-anchor'

// スクリーン基準28pxを現在ズーム倍率でviewBox単位に換算した値をしきい値とする
const SNAP_THRESHOLD_SCREEN_PX = 28
// §04-3: 大きい対象では画面基準28pxが相対的に細かすぎるので、短辺の15%を下限に敷く
const SNAP_THRESHOLD_SIZE_RATIO = 0.15

// ガイド線(viewBox座標系。vertical=x位置の縦線・horizontal=y位置の横線)。
// start/end は線に沿った方向の区間(vertical なら y、horizontal なら x)。
// 無限直線ではなく線分として持つのは、§04-3 の端点ドットと両端延長を描く位置が要るため
export type SnapGuide = { axis: 'vertical' | 'horizontal'; pos: number; start: number; end: number }

export type SnapResult = { x: number; y: number; guides: SnapGuide[] }

export type ResizeSnapResult = { rect: Rect; guides: SnapGuide[] }

// §04-3: しきい値 = max(画面28px ÷ 現在ズーム, 短辺×15%)。
// 小さい対象では画面基準が、大きい対象では寸法基準が勝つ
export const snapThreshold = (rect: Rect, scale: number): number =>
  Math.max(SNAP_THRESHOLD_SCREEN_PX / scale, Math.min(rect.w, rect.h) * SNAP_THRESHOLD_SIZE_RATIO)

// 吸着に参加させるドラッグ側の線。リサイズでは掴んだ側の辺だけを参加させ、
// 対辺と中心線は外す(参加させると固定したはずの対辺が引っぱられる)
type EdgePick = 'all' | 'start' | 'end' | 'none'

const linesOf = (lo: number, size: number, pick: EdgePick): number[] => {
  if (pick === 'all') return [lo, lo + size / 2, lo + size]
  if (pick === 'start') return [lo]
  if (pick === 'end') return [lo + size]
  return []
}

// 片軸ぶんの吸着結果。sibling が null なら吸着なし
type AxisSnap = { delta: number; pos: number; sibling: Rect | null }

const NO_SNAP: AxisSnap = { delta: 0, pos: 0, sibling: null }

const solveAxis = (
  dragging: Rect,
  siblings: Rect[],
  thresholdViewBox: number,
  axis: 'x' | 'y',
  pick: EdgePick
): AxisSnap => {
  const dragLines = linesOf(
    axis === 'x' ? dragging.x : dragging.y,
    axis === 'x' ? dragging.w : dragging.h,
    pick
  )
  if (dragLines.length === 0) return NO_SNAP
  let best = NO_SNAP
  let bestDist = Infinity
  for (const sib of siblings) {
    // 相手側は常に左右上下の辺と中心線の3本(辺↔辺・辺↔対辺・中心↔中心)
    for (const sibLine of linesOf(axis === 'x' ? sib.x : sib.y, axis === 'x' ? sib.w : sib.h, 'all')) {
      for (const dragLine of dragLines) {
        const dist = Math.abs(sibLine - dragLine)
        if (dist <= thresholdViewBox && dist < bestDist) {
          bestDist = dist
          best = { delta: sibLine - dragLine, pos: sibLine, sibling: sib }
        }
      }
    }
  }
  return best
}

// ガイド線分の範囲は「吸着相手と自分の両方を覆う区間」。片方だけに合わせると、
// 離れて並ぶ2枠のときに何と揃ったのかが線から読み取れなくなる
const guidesOf = (rect: Rect, snapX: AxisSnap, snapY: AxisSnap): SnapGuide[] => {
  const guides: SnapGuide[] = []
  if (snapX.sibling) {
    guides.push({
      axis: 'vertical',
      pos: snapX.pos,
      start: Math.min(rect.y, snapX.sibling.y),
      end: Math.max(rect.y + rect.h, snapX.sibling.y + snapX.sibling.h),
    })
  }
  if (snapY.sibling) {
    guides.push({
      axis: 'horizontal',
      pos: snapY.pos,
      start: Math.min(rect.x, snapY.sibling.x),
      end: Math.max(rect.x + rect.w, snapY.sibling.x + snapY.sibling.w),
    })
  }
  return guides
}

// ドラッグ中矩形を siblings(Team area・会議室・家具)のエッジ/中心線へ吸着。
// 移動なので大きさは変わらず、矩形ごと平行移動する
export const computeSnap = (dragging: Rect, siblings: Rect[], thresholdViewBox: number): SnapResult => {
  const snapX = solveAxis(dragging, siblings, thresholdViewBox, 'x', 'all')
  const snapY = solveAxis(dragging, siblings, thresholdViewBox, 'y', 'all')
  const snapped: Rect = { ...dragging, x: dragging.x + snapX.delta, y: dragging.y + snapY.delta }
  return { x: snapped.x, y: snapped.y, guides: guidesOf(snapped, snapX, snapY) }
}

// 掴んだハンドルが動かす辺。'nw' は x も y も始点側、'e' は x の終点側だけ動く
const pickOf = (handle: ResizeHandle, axis: 'x' | 'y'): EdgePick => {
  if (axis === 'x') return handle.includes('w') ? 'start' : handle.includes('e') ? 'end' : 'none'
  return handle.includes('n') ? 'start' : handle.includes('s') ? 'end' : 'none'
}

// 動く辺だけを吸着ぶん動かし、対辺は動かさない。始点側の辺なら原点も一緒に動く。
// 寸法の上下限は resizeRect と同じものを通す(吸着で最小寸法を割らせない)
const applyAxis = (lo: number, size: number, snap: AxisSnap, pick: EdgePick, min: number, max: number) => {
  if (!snap.sibling || pick === 'none') return { lo, size }
  if (pick === 'end') return { lo, size: clamp(size + snap.delta, min, max) }
  const next = clamp(size - snap.delta, min, max)
  return { lo: lo + size - next, size: next }
}

// §04-3: リサイズ中は対辺固定で、動く辺だけをスナップさせる
export const computeResizeSnap = (
  resized: Rect,
  siblings: Rect[],
  thresholdViewBox: number,
  handle: ResizeHandle,
  limits: ResizeLimits
): ResizeSnapResult => {
  const pickX = pickOf(handle, 'x')
  const pickY = pickOf(handle, 'y')
  const snapX = solveAxis(resized, siblings, thresholdViewBox, 'x', pickX)
  const snapY = solveAxis(resized, siblings, thresholdViewBox, 'y', pickY)
  const nextX = applyAxis(resized.x, resized.w, snapX, pickX, limits.minW, limits.max)
  const nextY = applyAxis(resized.y, resized.h, snapY, pickY, limits.minH, limits.max)
  const rect: Rect = { x: nextX.lo, y: nextY.lo, w: nextX.size, h: nextY.size }
  return { rect, guides: guidesOf(rect, snapX, snapY) }
}
