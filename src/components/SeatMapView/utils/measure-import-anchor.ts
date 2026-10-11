import { SEATMAP_BG_ID } from '@/components/SheetShell'

// §02-3: 取り込みのアンカーはビューポート中央のSVG座標。実測が取れないときの
// フォールバックだけは原典転記の固定値を使う
const IMPORT_ANCHOR_FALLBACK = { x: 960, y: 540 }

// §02-3 のアンカー実測。ゴーストと同じ経路(キャンバス矩形 + 変換層の transform)で読む。
// キャンバス内部の ref ではなく DOM フックを見るのは、この導線がキャンバスの外に居るため
export const viewportCenterAnchor = (): { x: number; y: number } => {
  const canvas = document.getElementById(SEATMAP_BG_ID)
  const layer = document.querySelector<HTMLElement>('[data-canvas-transform-layer="true"]')
  if (!canvas || !layer) return IMPORT_ANCHOR_FALLBACK
  const rect = canvas.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return IMPORT_ANCHOR_FALLBACK
  const matrix = new DOMMatrixReadOnly(getComputedStyle(layer).transform)
  const scale = matrix.a || 1
  return { x: (rect.width / 2 - matrix.e) / scale, y: (rect.height / 2 - matrix.f) / scale }
}
