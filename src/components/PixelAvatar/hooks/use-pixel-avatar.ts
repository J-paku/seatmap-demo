// PixelAvatar — config + seed から最終的に描画する parts を解決するフック
import { resolveAvatarConfig } from '@/utils/avatar/pixel-avatar-presets'
import {
  composeAvatarMatrix,
  resolvePixelColor,
  upscaleMatrix8to16,
} from '@/utils/avatar/matrices/compose'
import { buildKuroxxxRects, KUROXXX_GRID_SIZE } from '@/utils/avatar/kuroxxx-easter-egg'
import type { PartsAvatarConfig, PixelAvatarConfig, PixelsAvatarConfig } from '@/types'
import { buildRectsForPixels, buildRectsFromMatrix } from '../utils/build-pixel-rects'
import type { PixelRect } from '../utils/build-pixel-rects'

interface UsePixelAvatarArgs {
  config?: PixelAvatarConfig | null
}

interface UsePixelAvatarResult {
  parts: PartsAvatarConfig | null
  rects: PixelRect[]
  // 描画グリッドの一辺セル数 (通常パーツ=8 / pixels/イースターエッグ=16)
  size: number
}

export const usePixelAvatar = ({ config }: UsePixelAvatarArgs): UsePixelAvatarResult => {
  // kind='pixels' 経路 — 16x16 フリーピクセル直接描画
  if (config && config.kind === 'pixels') {
    const pixelsConfig = config as PixelsAvatarConfig
    return { parts: null, rects: buildRectsForPixels(pixelsConfig), size: 16 }
  }

  // kind='preset'/'parts' 経路 — parts に正規化して描画
  const parts = resolveAvatarConfig(config)

  // 隠しキャラ降臨イースターエッグだけ専用 16x16 ドット絵を描く (通常の 8x8 パーツ経路とは分離)
  if (parts.hair === 'kuroxxx') {
    return { parts, rects: buildKuroxxxRects(), size: KUROXXX_GRID_SIZE }
  }

  // 通常の parts: 8x8→16x16(×2 アップスケール)で描画 — 視覚的同一性を維持
  // 既存 parts の視覚的同一性(ドット感)は、1ドット=2x2ブロック で完全に保持される
  const matrix8 = composeAvatarMatrix(parts)
  const matrix16 = upscaleMatrix8to16(matrix8)
  return {
    parts,
    rects: buildRectsFromMatrix(matrix16, 16, cell =>
      cell ? resolvePixelColor(cell, parts.palette) : null
    ),
    size: 16,
  }
}
