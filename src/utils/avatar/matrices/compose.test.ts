import { describe, it, expect } from 'vitest'
import {
  composeAvatarMatrix,
  upscaleMatrix8to16,
  composePixelsAvatarMatrix,
  resolvePixelColor,
  resolvePixelColorForFree,
} from './compose'
import type { AvatarPalette, PartsAvatarConfig, PixelsAvatarConfig } from '@/types'

const basePalette: AvatarPalette = {
  hair: '#2A1A0F',
  skin: '#F0C49A',
  outfit: '#3B6EA8',
  outfitDark: '#2C4F7A',
}

describe('composeAvatarMatrix — レイヤー順 (outfit → skin → face → hair → accessory)', () => {
  it('hair:short / face:slit / outfit:solid / accessory無し の場合、下位レイヤーの上書き関係が期待どおりになる', () => {
    const parts: PartsAvatarConfig = {
      kind: 'parts',
      hair: 'short',
      face: 'slit',
      outfit: 'solid',
      palette: basePalette,
    }
    const result = composeAvatarMatrix(parts)

    // row2: skin の頬部分(col2-5)は hair に上書きされず残るが、col1/col6 は hair(short) が skin(null) の上に乗る
    expect(result[2]).toEqual([null, 'hair', 'skin', 'skin', 'skin', 'skin', 'hair', null])

    // row3: skin→face(eyes)→hair の重なりを全パターン含む行
    // col1/col6: hair のみ / col2,4: skin のみ(faceがnull) / col3,5: face(eyes) が skin を上書き / col0,7: 全レイヤーnull
    expect(result[3]).toEqual([null, 'hair', 'skin', 'eyes', 'skin', 'eyes', 'hair', null])

    // row6: outfit(solid) の胴体行。他レイヤーが全て null なので outfit そのまま
    expect(result[6]).toEqual([
      'outfit',
      'outfit',
      'outfit',
      'outfit',
      'outfit',
      'outfit',
      'outfit',
      'outfit',
    ])

    // row7: outfit(solid) の裾行(outfitDark の陰影を含む)
    expect(result[7]).toEqual([
      'outfit',
      'outfit',
      'outfitDark',
      'outfitDark',
      'outfitDark',
      'outfitDark',
      'outfit',
      'outfit',
    ])
  })

  it('accessory を指定すると最上位レイヤーとして face/skin を上書きする (hair:bald / face:serious / accessory:glasses / outfit:suit)', () => {
    const parts: PartsAvatarConfig = {
      kind: 'parts',
      hair: 'bald',
      face: 'serious',
      accessory: 'glasses',
      outfit: 'suit',
      palette: { ...basePalette, accessory: '#1A1A1A' },
    }
    const result = composeAvatarMatrix(parts)

    // row2: skin の頬(col2-5)のうち col2,5 は face(serious eyes) に上書きされる
    expect(result[2]).toEqual([null, null, 'eyes', 'skin', 'skin', 'eyes', null, null])

    // row3: skin→face(eyes col3,5)→accessory(glasses col2,3,5,6) の重なり。col4 は accessory も null なので skin のまま
    expect(result[3]).toEqual([
      null,
      null,
      'accessory',
      'accessory',
      'skin',
      'accessory',
      'accessory',
      null,
    ])

    // row4: skin(col2-5) に対し accessory(glasses col4) だけが上書きする
    expect(result[4]).toEqual([null, null, 'skin', 'skin', 'accessory', 'skin', null, null])

    // row6/row7: outfit(suit) の胴体・裾。他レイヤーは全 null なので outfit のまま
    expect(result[6]).toEqual([
      'outfit',
      'outfit',
      'outfit',
      'outfitAlt',
      'outfitAlt',
      'outfit',
      'outfit',
      'outfit',
    ])
    expect(result[7]).toEqual([
      'outfitDark',
      'outfit',
      'outfitDark',
      'outfitAlt',
      'outfitAlt',
      'outfitDark',
      'outfit',
      'outfitDark',
    ])
  })

  it('accessory 未指定 (undefined) は accessory:"none" と同じく、accessory レイヤーを一切合成しない', () => {
    const withUndefined: PartsAvatarConfig = {
      kind: 'parts',
      hair: 'short',
      face: 'slit',
      outfit: 'solid',
      palette: basePalette,
    }
    const withNone: PartsAvatarConfig = { ...withUndefined, accessory: 'none' }
    expect(composeAvatarMatrix(withUndefined)).toEqual(composeAvatarMatrix(withNone))
  })

  it('合成結果は常に 8x8 の行列になる', () => {
    const parts: PartsAvatarConfig = {
      kind: 'parts',
      hair: 'long',
      face: 'happy',
      outfit: 'hoodie',
      palette: basePalette,
    }
    const result = composeAvatarMatrix(parts)
    expect(result).toHaveLength(8)
    for (const row of result) {
      expect(row).toHaveLength(8)
    }
  })
})

describe('upscaleMatrix8to16 — 8x8 → 16x16 の nearest-neighbor 2倍拡大', () => {
  it('16x16 になり、各 2x2 ブロックが元セルの複製になる (composeAvatarMatrix の実出力で検証)', () => {
    const parts: PartsAvatarConfig = {
      kind: 'parts',
      hair: 'short',
      face: 'slit',
      outfit: 'solid',
      palette: basePalette,
    }
    const matrix8 = composeAvatarMatrix(parts)
    const matrix16 = upscaleMatrix8to16(matrix8)

    expect(matrix16).toHaveLength(16)
    for (const row of matrix16) {
      expect(row).toHaveLength(16)
    }

    // 全セルについて 2x2 ブロックが元の 8x8 セルと一致することを網羅的に検証する
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const source = matrix8[y][x]
        expect(matrix16[y * 2][x * 2]).toBe(source)
        expect(matrix16[y * 2][x * 2 + 1]).toBe(source)
        expect(matrix16[y * 2 + 1][x * 2]).toBe(source)
        expect(matrix16[y * 2 + 1][x * 2 + 1]).toBe(source)
      }
    }
  })

  it('row6 (outfit 一色) は 16x16 の row12/row13 とも全列 "outfit" になる', () => {
    const parts: PartsAvatarConfig = {
      kind: 'parts',
      hair: 'short',
      face: 'slit',
      outfit: 'solid',
      palette: basePalette,
    }
    const matrix16 = upscaleMatrix8to16(composeAvatarMatrix(parts))
    expect(matrix16[12]).toEqual(Array<string>(16).fill('outfit'))
    expect(matrix16[13]).toEqual(Array<string>(16).fill('outfit'))
  })
})

describe('composePixelsAvatarMatrix — 16x16 フリーピクセルの直接色解決', () => {
  it('palette に存在するキー文字はそのままキーとして結果に反映される', () => {
    const rows = Array.from({ length: 16 }, (_, y) => (y === 0 ? 's' + '.'.repeat(15) : '.'.repeat(16)))
    const config: PixelsAvatarConfig = { kind: 'pixels', size: 16, palette: { s: '#F0C49A' }, rows }
    const result = composePixelsAvatarMatrix(config)
    expect(result[0][0]).toBe('s')
    expect(result[0][1]).toBeNull()
    expect(result[1][0]).toBeNull()
  })

  it('palette に存在しないキー文字 (未知キー) は "." と同様 null 扱いになる', () => {
    const rows = Array.from({ length: 16 }, (_, y) => (y === 0 ? 'x' + '.'.repeat(15) : '.'.repeat(16)))
    const config: PixelsAvatarConfig = { kind: 'pixels', size: 16, palette: { s: '#F0C49A' }, rows }
    const result = composePixelsAvatarMatrix(config)
    expect(result[0][0]).toBeNull()
  })

  it('row 文字列が16文字未満の場合、欠けた列は "." 扱いで null になる', () => {
    const rows = Array.from({ length: 16 }, (_, y) => (y === 0 ? 's' : ''))
    const config: PixelsAvatarConfig = { kind: 'pixels', size: 16, palette: { s: '#F0C49A' }, rows }
    const result = composePixelsAvatarMatrix(config)
    expect(result[0][0]).toBe('s')
    expect(result[0][1]).toBeNull()
    expect(result[0][15]).toBeNull()
  })
})

describe('resolvePixelColor — parts 合成用の色解決', () => {
  const palette: AvatarPalette = {
    hair: '#111111',
    skin: '#222222',
    outfit: '#333333',
    outfitDark: '#444444',
    outfitAlt: '#555555',
    accessory: '#666666',
  }

  it('eyes / mouth は palette に依らない固定色を返す', () => {
    expect(resolvePixelColor('eyes', palette)).toBe('#1A1A1A')
    expect(resolvePixelColor('mouth', palette)).toBe('#B05030')
  })

  it('hair / skin / outfit / outfitDark / outfitAlt / accessory は対応する palette 値を返す', () => {
    expect(resolvePixelColor('hair', palette)).toBe('#111111')
    expect(resolvePixelColor('skin', palette)).toBe('#222222')
    expect(resolvePixelColor('outfit', palette)).toBe('#333333')
    expect(resolvePixelColor('outfitDark', palette)).toBe('#444444')
    expect(resolvePixelColor('outfitAlt', palette)).toBe('#555555')
    expect(resolvePixelColor('accessory', palette)).toBe('#666666')
  })

  it('outfitAlt が未指定なら outfit にフォールバックする', () => {
    const { outfitAlt: _omit, ...withoutAlt } = palette
    expect(resolvePixelColor('outfitAlt', withoutAlt)).toBe('#333333')
  })

  it('accessory が未指定なら固定フォールバック色 #1A1A1A を返す', () => {
    const { accessory: _omit, ...withoutAccessory } = palette
    expect(resolvePixelColor('accessory', withoutAccessory)).toBe('#1A1A1A')
  })

  it('未知のキーは "transparent" を返す', () => {
    expect(resolvePixelColor('unknown-key', palette)).toBe('transparent')
  })
})

describe('resolvePixelColorForFree — フリーピクセル用の色解決', () => {
  const palette: Record<string, string> = { s: '#F0C49A', o: '#3B6EA8' }

  it('"." は "transparent" を返す', () => {
    expect(resolvePixelColorForFree('.', palette)).toBe('transparent')
  })

  it('空文字は "transparent" を返す', () => {
    expect(resolvePixelColorForFree('', palette)).toBe('transparent')
  })

  it('palette に存在するキーはその HEX 値を返す', () => {
    expect(resolvePixelColorForFree('s', palette)).toBe('#F0C49A')
    expect(resolvePixelColorForFree('o', palette)).toBe('#3B6EA8')
  })

  it('palette に存在しないキーは "transparent" を返す', () => {
    expect(resolvePixelColorForFree('z', palette)).toBe('transparent')
  })
})
