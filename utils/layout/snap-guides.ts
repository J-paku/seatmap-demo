// 07-admin-edit: 整列スナップ(ドラッグ中のエッジ・中心線吸着)計算
import type { Rect } from './rect'

// スクリーン基準28pxを現在ズーム倍率でviewBox単位に換算した値をしきい値とする
export const SNAP_THRESHOLD_SCREEN_PX = 28

// ガイド線(viewBox座標系。vertical=x位置の縦線・horizontal=y位置の横線)
export type SnapGuide = { axis: 'vertical' | 'horizontal'; pos: number }

export type SnapResult = { x: number; y: number; guides: SnapGuide[] }

// 矩形の吸着候補ライン(左端・中心・右端 / 上端・中心・下端)
const xLines = (r: Rect) => [r.x, r.x + r.w / 2, r.x + r.w]
const yLines = (r: Rect) => [r.y, r.y + r.h / 2, r.y + r.h]

// ドラッグ中矩形を siblings(座席・Facility・Team area)のエッジ/中心線へ吸着
export const computeSnap = (
  dragging: Rect,
  siblings: Rect[],
  thresholdViewBox: number
): SnapResult => {
  const dragX = xLines(dragging)
  const dragY = yLines(dragging)
  const guides: SnapGuide[] = []
  let bestDx = 0
  let bestDxDist = Infinity
  let bestDy = 0
  let bestDyDist = Infinity
  let snapVerticalPos = 0
  let snapHorizontalPos = 0

  for (const sib of siblings) {
    for (const sx of xLines(sib)) {
      for (const dx of dragX) {
        const dist = Math.abs(sx - dx)
        if (dist <= thresholdViewBox && dist < bestDxDist) {
          bestDxDist = dist
          bestDx = sx - dx
          snapVerticalPos = sx
        }
      }
    }
    for (const sy of yLines(sib)) {
      for (const dy of dragY) {
        const dist = Math.abs(sy - dy)
        if (dist <= thresholdViewBox && dist < bestDyDist) {
          bestDyDist = dist
          bestDy = sy - dy
          snapHorizontalPos = sy
        }
      }
    }
  }

  if (bestDxDist !== Infinity) guides.push({ axis: 'vertical', pos: snapVerticalPos })
  if (bestDyDist !== Infinity) guides.push({ axis: 'horizontal', pos: snapHorizontalPos })

  return {
    x: dragging.x + (bestDxDist !== Infinity ? bestDx : 0),
    y: dragging.y + (bestDyDist !== Infinity ? bestDy : 0),
    guides,
  }
}
