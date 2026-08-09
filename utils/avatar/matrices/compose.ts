// パーツ合成と色解決 — usePixelAvatar から呼び出されるエントリポイント
import type {
  AvatarPalette,
  PartsAvatarConfig,
  PixelMatrix,
  PixelsAvatarConfig,
} from '@/types'
import { SKIN_BASE_MATRIX } from './skin-base-matrix'
import { HAIR_MATRICES } from './hair-matrices'
import { FACE_MATRICES } from './face-matrices'
import { ACCESSORY_MATRICES } from './accessory-matrices'
import { OUTFIT_MATRICES } from './outfit-matrices'

// レイヤー順に上書きしながら 8x8 マトリクスを 1 枚に合成
// z-order: outfit (z0) → skin (z1) → face (z2) → hair (z3) → accessory (z4)
export const composeAvatarMatrix = (parts: PartsAvatarConfig): PixelMatrix => {
  const layers: PixelMatrix[] = [
    OUTFIT_MATRICES[parts.outfit],
    SKIN_BASE_MATRIX,
    FACE_MATRICES[parts.face],
    HAIR_MATRICES[parts.hair],
  ]
  const accessory = parts.accessory ?? 'none'
  if (accessory !== 'none') {
    layers.push(ACCESSORY_MATRICES[accessory])
  }
  const result: PixelMatrix = Array.from({ length: 8 }, () => Array<string | null>(8).fill(null))
  for (const layer of layers) {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const cell = layer[y]?.[x]
        if (cell) {
          result[y][x] = cell
        }
      }
    }
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
export const upscaleMatrix8to16 = (matrix8: PixelMatrix): PixelMatrix => {
  const result: PixelMatrix = Array.from({ length: 16 }, () => Array<string | null>(16).fill(null))
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const cell = matrix8[y]?.[x]
      // 2x2 ブロックに展開
      result[y * 2][x * 2] = cell
      result[y * 2][x * 2 + 1] = cell
      result[y * 2 + 1][x * 2] = cell
      result[y * 2 + 1][x * 2 + 1] = cell
    }
  }
  return result
}

// 16x16 フリーピクセルマトリクスを生成 — rows+palette から色を直接解決
export const composePixelsAvatarMatrix = (config: PixelsAvatarConfig): PixelMatrix => {
  const result: PixelMatrix = Array.from({ length: 16 }, () => Array<string | null>(16).fill(null))
  for (let y = 0; y < 16; y++) {
    const row = config.rows[y] ?? ''
    for (let x = 0; x < 16; x++) {
      const char = row[x] ?? '.'
      const color = char !== '.' ? config.palette[char] : null
      result[y][x] = color ? char : null
    }
  }
  return result
}

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
  if (char === '.' || !char) return 'transparent'
  return palette[char] ?? 'transparent'
}
