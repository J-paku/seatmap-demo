// アバター用 hex 色操作ユーティリティ — 服の単色から陰影/差し色を派生する純粋関数群
import type { AvatarPalette } from '@/types'

// 0〜255 にクランプして丸める
const clampByte = (n: number): number => Math.max(0, Math.min(255, Math.round(n)))

// #RRGGBB を [r, g, b] に分解
const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

// [r, g, b] を #RRGGBB に変換
const rgbToHex = (rgb: [number, number, number]): string =>
  `#${rgb.map(c => clampByte(c).toString(16).padStart(2, '0')).join('')}`

// 指定割合だけ暗くする
const darken = (hex: string, factor: number): string => {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex([r * (1 - factor), g * (1 - factor), b * (1 - factor)])
}

// 指定割合だけ明るくする
const lighten = (hex: string, factor: number): string => {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex([r + (255 - r) * factor, g + (255 - g) * factor, b + (255 - b) * factor])
}

// 服の単色から outfit / outfitDark / outfitAlt の三色を生成
export const deriveOutfitColors = (
  base: string
): Pick<AvatarPalette, 'outfit' | 'outfitDark' | 'outfitAlt'> => ({
  outfit: base,
  outfitDark: darken(base, 0.26),
  outfitAlt: lighten(base, 0.32),
})
