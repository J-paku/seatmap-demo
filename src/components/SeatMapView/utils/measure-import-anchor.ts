import { findCanvas, findLayer, readTransform } from '@/utils/layout/read-canvas-transform'

// §02-3: 取り込みのアンカーはビューポート中央のSVG座標。実測が取れないときの
// フォールバックだけは原典転記の固定値を使う
const IMPORT_ANCHOR_FALLBACK = { x: 960, y: 540 }

// §02-3 のアンカー実測。ゴーストと同じ経路(キャンバス矩形 + 変換層の transform)で読む。
// キャンバス内部の ref ではなく DOM フックを見るのは、この導線がキャンバスの外に居るため
export const viewportCenterAnchor = (): { x: number; y: number } => {
  const canvas = findCanvas()
  const layer = findLayer()
  if (!canvas || !layer) return IMPORT_ANCHOR_FALLBACK
  const rect = canvas.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return IMPORT_ANCHOR_FALLBACK
  const { scale, tx, ty } = readTransform(layer)
  return { x: (rect.width / 2 - tx) / scale, y: (rect.height / 2 - ty) / scale }
}
