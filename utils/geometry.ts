// 02-seatmap-core: 変換パイプラインと初期ビューポートの数学

export type Transform = { scale: number; translateX: number; translateY: number }

export const VIEWBOX_W = 1600
// 座席2行化で箱高が伸びた分、実測ジオメトリ(teamZoneBottom=1114)+余白40から算出(scripts/generate-mocks.mjs 実行結果と同期)
export const VIEWBOX_H = 1154
export const MAX_SCALE = 5

export const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))

// 論理座標 → 画面座標
export const toScreen = (logical: number, scale: number, translate: number) =>
  logical * scale + translate

// 画面座標 → 論理座標
export const toLogical = (screen: number, scale: number, translate: number) =>
  (screen - translate) / scale

// 初期コンパクト変換(余白15%・中央配置・上限0.65)
export const computeCompact = (containerW: number, containerH: number): Transform => {
  if (containerW <= 0 || containerH <= 0) {
    return { scale: 0.8, translateX: 0, translateY: 0 }
  }
  const fitScale = Math.min(containerW / VIEWBOX_W, containerH / VIEWBOX_H)
  const compact = clamp(fitScale * 0.85, 0.25, Math.min(MAX_SCALE, 0.65))
  return {
    scale: compact,
    translateX: (containerW - VIEWBOX_W * compact) / 2,
    translateY: (containerH - VIEWBOX_H * compact) / 2,
  }
}

// minScale = max(0.25, compact×0.4)。操作ごとに現コンテナ基準で再算出
export const computeMinScale = (containerW: number, containerH: number) => {
  const compact = computeCompact(containerW, containerH).scale
  return Math.max(0.25, compact * 0.4)
}

// 基点(画面座標 anchor)を固定したまま scale を newScale にする translate を返す
export const zoomAtPoint = (
  t: Transform,
  newScale: number,
  anchorScreenX: number,
  anchorScreenY: number
): Transform => {
  const lx = toLogical(anchorScreenX, t.scale, t.translateX)
  const ly = toLogical(anchorScreenY, t.scale, t.translateY)
  return {
    scale: newScale,
    translateX: anchorScreenX - lx * newScale,
    translateY: anchorScreenY - ly * newScale,
  }
}

// scale ↔ level(log2)。1レベル=×2/÷2
export const scaleToLevel = (scale: number) => Math.log2(scale)
export const levelToScale = (level: number) => 2 ** level
