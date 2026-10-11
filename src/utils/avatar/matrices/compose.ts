// パーツ合成と色解決 — usePixelAvatar から呼び出されるエントリポイント
import type { AvatarPalette, PartsAvatarConfig, PixelMatrix, PixelsAvatarConfig } from '@/types'
import { SKIN_BASE_MATRIX } from './skin-base-matrix'
import { HAIR_MATRICES } from './hair-matrices'
import { FACE_MATRICES } from './face-matrices'
import { ACCESSORY_MATRICES } from './accessory-matrices'
import { OUTFIT_MATRICES } from './outfit-matrices'

// レイヤー順に上書きしながら 8x8 マトリクスを 1 枚に合成
// z-order: outfit (z0) → skin (z1) → face (z2) → hair (z3) → accessory (z4)
export const composeAvatarMatrix = (parts: PartsAvatarConfig): PixelMatrix => {
  // accessory 未指定は 'none' (全セル null の行列) を重ねるのと同じで、見た目は変わらない
  const layers: PixelMatrix[] = [
    OUTFIT_MATRICES[parts.outfit],
    SKIN_BASE_MATRIX,
    FACE_MATRICES[parts.face],
    HAIR_MATRICES[parts.hair],
    ACCESSORY_MATRICES[parts.accessory ?? 'none'],
  ]
  const result: PixelMatrix = Array.from({ length: 8 }, () => Array<string | null>(8).fill(null))
  for (const layer of layers) {
    layer.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          result[y][x] = cell
        }
      })
    })
  }
  return result
}

// 固定色 — 目と口はパレットから外して全キャラ共通の自然な色味
const FIXED_EYE_COLOR = '#1A1A1A'
const FIXED_MOUTH_COLOR = '#B05030'
const FALLBACK_ACCESSORY_COLOR = '#1A1A1A'

// 8x8 マトリクスを 16x16 に ×2 nearest-neighbor アップスケール
// 各セルを 2x2 ブロックに展開 (1ドット=2x2ブロック)
// 既存パーツ(parts/preset)の視覚的同一性を無損失で保持
// 16x16 の (y, x) は 8x8 の (y/2, x/2) の切り捨てを指す = 2x2 ブロックが同じセルになる
export const upscaleMatrix8to16 = (matrix8: PixelMatrix): PixelMatrix =>
  Array.from({ length: 16 }, (_, y) =>
    Array.from({ length: 16 }, (_, x) => matrix8[Math.floor(y / 2)]?.[Math.floor(x / 2)])
  )

// フリーピクセルの透明セルを表す文字。palette に同じキーがあっても透明として扱う
const TRANSPARENT_PIXEL_KEY = '.'

// 16x16 フリーピクセルマトリクスを生成 — rows+palette から色を直接解決
// rows の欠けた行・列は透明セルとして扱う
export const composePixelsAvatarMatrix = (config: PixelsAvatarConfig): PixelMatrix =>
  Array.from({ length: 16 }, (_, y) =>
    Array.from({ length: 16 }, (_, x) => {
      const char = config.rows[y]?.[x] ?? TRANSPARENT_PIXEL_KEY
      return char !== TRANSPARENT_PIXEL_KEY && config.palette[char] ? char : null
    })
  )

export const resolvePixelColor = (key: string, palette: AvatarPalette): string => {
  switch (key) {
    case 'eyes':
      return FIXED_EYE_COLOR
    case 'mouth':
      return FIXED_MOUTH_COLOR
    case 'hair':
      return palette.hair
    case 'skin':
      return palette.skin
    case 'outfit':
      return palette.outfit
    case 'outfitDark':
      return palette.outfitDark
    case 'outfitAlt':
      return palette.outfitAlt ?? palette.outfit
    case 'accessory':
      return palette.accessory ?? FALLBACK_ACCESSORY_COLOR
    default:
      return 'transparent'
  }
}

// フリーピクセル用色解決 — rows の文字キーを palette で直接HEX化
export const resolvePixelColorForFree = (char: string, palette: Record<string, string>): string => {
  if (char === TRANSPARENT_PIXEL_KEY || !char) return 'transparent'
  return palette[char] ?? 'transparent'
}
