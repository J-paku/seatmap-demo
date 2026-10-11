import { describe, it, expect } from 'vitest'
import { deriveOutfitColors } from './avatar-color-utils'

describe('deriveOutfitColors', () => {
  it('outfit フィールドは base 値をそのまま返す (加工しない)', () => {
    const result = deriveOutfitColors('#804020')
    expect(result.outfit).toBe('#804020')
  })

  it('outfitDark は base を 26% 暗くした色になる', () => {
    // r=128,g=64,b=32 各チャンネル*0.74 → round(94.72,47.36,23.68) = 95,47,24 → 5f,2f,18
    const result = deriveOutfitColors('#804020')
    expect(result.outfitDark).toBe('#5f2f18')
  })

  it('outfitAlt は base を 32% 明るくした色になる', () => {
    // r=128,g=64,b=32 に (255-c)*0.32 を加算 → round(168.64,125.12,103.36) = 169,125,103 → a9,7d,67
    const result = deriveOutfitColors('#804020')
    expect(result.outfitAlt).toBe('#a97d67')
  })

  it('outfit / outfitDark / outfitAlt の3キーのみを返す', () => {
    const result = deriveOutfitColors('#804020')
    expect(Object.keys(result).sort()).toEqual(['outfit', 'outfitAlt', 'outfitDark'])
  })

  it('白 (#FFFFFF) は 255 上限でクランプされ outfitAlt が変化しない', () => {
    const result = deriveOutfitColors('#FFFFFF')
    expect(result.outfitDark).toBe('#bdbdbd')
    expect(result.outfitAlt).toBe('#ffffff')
  })

  it('黒 (#000000) は 0 下限でクランプされ outfitDark が変化しない', () => {
    const result = deriveOutfitColors('#000000')
    expect(result.outfitDark).toBe('#000000')
    expect(result.outfitAlt).toBe('#525252')
  })

  it('大文字 HEX 入力でも正しくパースされる (出力は toString(16) 由来で小文字)', () => {
    const result = deriveOutfitColors('#AABBCC')
    // r=170,g=187,b=204 * 0.74 → round(125.8,138.38,150.96) = 126,138,151 → 7e,8a,97
    expect(result.outfitDark).toBe('#7e8a97')
  })
})
