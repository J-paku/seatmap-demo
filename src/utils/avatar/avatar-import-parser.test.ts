import { describe, it, expect } from 'vitest'
import { parseAiImportedConfig } from './avatar-import-parser'
import { deriveOutfitColors } from './avatar-color-utils'

// parts 経路で常に有効な最小構成 (テスト全体の基準値)
const validParts = {
  kind: 'parts',
  hair: 'short',
  face: 'slit',
  accessory: 'glasses',
  outfit: 'solid',
  palette: {
    hair: '#2A1A0F',
    skin: '#F0C49A',
    outfit: '#3B6EA8',
    outfitDark: '#2C4F7A',
  },
}

describe('parseAiImportedConfig — JSON / kind 分岐の共通経路', () => {
  it('不正な JSON 文字列は invalidJson を返す', () => {
    const result = parseAiImportedConfig('{not valid json')
    expect(result).toEqual({ ok: false, error: 'invalidJson' })
  })

  it('トップレベルが配列だと invalidJson を返す (オブジェクトのみ許可)', () => {
    const result = parseAiImportedConfig('[1,2,3]')
    expect(result).toEqual({ ok: false, error: 'invalidJson' })
  })

  it('トップレベルが数値だと invalidJson を返す', () => {
    const result = parseAiImportedConfig('42')
    expect(result).toEqual({ ok: false, error: 'invalidJson' })
  })

  it('トップレベルが null だと invalidJson を返す', () => {
    const result = parseAiImportedConfig('null')
    expect(result).toEqual({ ok: false, error: 'invalidJson' })
  })

  it('kind フィールドが無いと invalidKind を返す', () => {
    const result = parseAiImportedConfig(JSON.stringify({ hair: 'short' }))
    expect(result).toEqual({ ok: false, error: 'invalidKind' })
  })

  it('kind が未知の値だと invalidKind を返す', () => {
    const result = parseAiImportedConfig(JSON.stringify({ kind: 'sprite' }))
    expect(result).toEqual({ ok: false, error: 'invalidKind' })
  })

  it('単一のコードフェンス (```json ... ```) は中身を剥がしてパースする', () => {
    const fenced = '```json\n' + JSON.stringify(validParts) + '\n```'
    const result = parseAiImportedConfig(fenced)
    expect(result.ok).toBe(true)
  })

  it('言語指定なしのコードフェンスも剥がしてパースする', () => {
    const fenced = '```\n' + JSON.stringify(validParts) + '\n```'
    const result = parseAiImportedConfig(fenced)
    expect(result.ok).toBe(true)
  })

  it('説明文つきの複数ブロックはフェンス全体一致しないため剥がされず invalidJson になる', () => {
    const wrapped = 'ここにコードがあります:\n```json\n' + JSON.stringify(validParts) + '\n```\n以上です'
    const result = parseAiImportedConfig(wrapped)
    expect(result).toEqual({ ok: false, error: 'invalidJson' })
  })
})

describe('parseAiImportedConfig — kind: parts 経路', () => {
  it('全フィールドが有効な parts 構成は ok:true で正規化済み config を返す', () => {
    const result = parseAiImportedConfig(JSON.stringify(validParts))
    expect(result).toEqual({
      ok: true,
      config: {
        kind: 'parts',
        hair: 'short',
        face: 'slit',
        accessory: 'glasses',
        outfit: 'solid',
        palette: {
          hair: '#2A1A0F',
          skin: '#F0C49A',
          outfit: '#3B6EA8',
          outfitDark: '#2C4F7A',
          outfitAlt: deriveOutfitColors('#3B6EA8').outfitAlt,
        },
      },
    })
  })

  it('旧 ID "afro" は normalizeHairId 経由で "neatBob" に正規化されて受理される', () => {
    const result = parseAiImportedConfig(JSON.stringify({ ...validParts, hair: 'afro' }))
    expect(result.ok).toBe(true)
    if (result.ok && result.config.kind === 'parts') {
      expect(result.config.hair).toBe('neatBob')
    }
  })

  it('hair が存在しない ID だと invalidHair を返す', () => {
    const result = parseAiImportedConfig(JSON.stringify({ ...validParts, hair: 'punk-999' }))
    expect(result).toEqual({ ok: false, error: 'invalidHair' })
  })

  it('hair フィールド自体が無いと invalidHair を返す', () => {
    const { hair, ...rest } = validParts
    const result = parseAiImportedConfig(JSON.stringify(rest))
    expect(result).toEqual({ ok: false, error: 'invalidHair' })
  })

  it('face が存在しない ID だと invalidFace を返す', () => {
    const result = parseAiImportedConfig(JSON.stringify({ ...validParts, face: 'grumpy' }))
    expect(result).toEqual({ ok: false, error: 'invalidFace' })
  })

  it('accessory が存在しない ID だと invalidAccessory を返す', () => {
    const result = parseAiImportedConfig(JSON.stringify({ ...validParts, accessory: 'monocle' }))
    expect(result).toEqual({ ok: false, error: 'invalidAccessory' })
  })

  it('outfit が存在しない ID だと invalidOutfit を返す', () => {
    const result = parseAiImportedConfig(JSON.stringify({ ...validParts, outfit: 'kimono' }))
    expect(result).toEqual({ ok: false, error: 'invalidOutfit' })
  })

  it('palette がオブジェクトでないと invalidPalette を返す', () => {
    const result = parseAiImportedConfig(JSON.stringify({ ...validParts, palette: 'red' }))
    expect(result).toEqual({ ok: false, error: 'invalidPalette' })
  })

  it('palette の必須キー (outfitDark) が欠けると invalidPalette を返す', () => {
    const { outfitDark, ...restPalette } = validParts.palette
    const result = parseAiImportedConfig(JSON.stringify({ ...validParts, palette: restPalette }))
    expect(result).toEqual({ ok: false, error: 'invalidPalette' })
  })

  it('palette の値が HEX 形式でないと invalidPalette を返す', () => {
    const result = parseAiImportedConfig(
      JSON.stringify({ ...validParts, palette: { ...validParts.palette, skin: 'skyblue' } })
    )
    expect(result).toEqual({ ok: false, error: 'invalidPalette' })
  })

  it('palette.outfitAlt を明示指定した場合は deriveOutfitColors で上書きせずそのまま使う', () => {
    const result = parseAiImportedConfig(
      JSON.stringify({ ...validParts, palette: { ...validParts.palette, outfitAlt: '#FFFFFF' } })
    )
    expect(result.ok).toBe(true)
    if (result.ok && result.config.kind === 'parts') {
      expect(result.config.palette.outfitAlt).toBe('#FFFFFF')
    }
  })

  it('accessory の色が palette に無ければ config.palette.accessory は存在しない', () => {
    const result = parseAiImportedConfig(JSON.stringify(validParts))
    expect(result.ok).toBe(true)
    if (result.ok && result.config.kind === 'parts') {
      expect(Object.prototype.hasOwnProperty.call(result.config.palette, 'accessory')).toBe(false)
    }
  })

  it('accessory の色が palette にあれば config.palette.accessory に反映される', () => {
    const result = parseAiImportedConfig(
      JSON.stringify({ ...validParts, palette: { ...validParts.palette, accessory: '#123456' } })
    )
    expect(result.ok).toBe(true)
    if (result.ok && result.config.kind === 'parts') {
      expect(result.config.palette.accessory).toBe('#123456')
    }
  })
})

describe('parseAiImportedConfig — kind: pixels 経路', () => {
  const opaqueRows = Array.from({ length: 16 }, () => 's'.repeat(16))
  const validPixels = {
    kind: 'pixels',
    size: 16,
    palette: { s: '#F0C49A' },
    rows: opaqueRows,
  }

  it('size が 16 以外だと pixelsInvalidSize を返す', () => {
    const result = parseAiImportedConfig(JSON.stringify({ ...validPixels, size: 8 }))
    expect(result).toEqual({ ok: false, error: 'pixelsInvalidSize' })
  })

  it('size が数値でないと pixelsInvalidSize を返す', () => {
    const result = parseAiImportedConfig(JSON.stringify({ ...validPixels, size: '16' }))
    expect(result).toEqual({ ok: false, error: 'pixelsInvalidSize' })
  })

  it('rows が配列でないと pixelsInvalidRows を返す', () => {
    const result = parseAiImportedConfig(JSON.stringify({ ...validPixels, rows: 'not-array' }))
    expect(result).toEqual({ ok: false, error: 'pixelsInvalidRows' })
  })

  it('rows の要素数が 16 でないと pixelsInvalidRows を返す', () => {
    const result = parseAiImportedConfig(
      JSON.stringify({ ...validPixels, rows: opaqueRows.slice(0, 15) })
    )
    expect(result).toEqual({ ok: false, error: 'pixelsInvalidRows' })
  })

  it('rows の各行が文字列でないと pixelsInvalidRows を返す', () => {
    const rows = [...opaqueRows]
    rows[0] = 123 as unknown as string
    const result = parseAiImportedConfig(JSON.stringify({ ...validPixels, rows }))
    expect(result).toEqual({ ok: false, error: 'pixelsInvalidRows' })
  })

  it('rows の各行が16文字でないと pixelsInvalidRows を返す', () => {
    const rows = [...opaqueRows]
    rows[0] = 'short'
    const result = parseAiImportedConfig(JSON.stringify({ ...validPixels, rows }))
    expect(result).toEqual({ ok: false, error: 'pixelsInvalidRows' })
  })

  it('palette がオブジェクトでないと pixelsInvalidPalette を返す', () => {
    const result = parseAiImportedConfig(JSON.stringify({ ...validPixels, palette: [1, 2] }))
    expect(result).toEqual({ ok: false, error: 'pixelsInvalidPalette' })
  })

  it('palette の不正な HEX エントリは無視され、有効なエントリのみ反映される', () => {
    const result = parseAiImportedConfig(
      JSON.stringify({ ...validPixels, palette: { s: '#F0C49A', bad: 'not-a-color' } })
    )
    expect(result.ok).toBe(true)
    if (result.ok && result.config.kind === 'pixels') {
      expect(result.config.palette).toEqual({ s: '#F0C49A' })
    }
  })

  it('十分に不透明な rows はマスク正規化されずそのまま返る', () => {
    const result = parseAiImportedConfig(JSON.stringify(validPixels))
    expect(result.ok).toBe(true)
    if (result.ok && result.config.kind === 'pixels') {
      expect(result.config.rows).toEqual(opaqueRows)
      expect(result.config.size).toBe(16)
    }
  })

  it('全面透明な rows は顔マスク(row4-9,col4-11)と体マスク(row12-15,col0-15)が自動充填される', () => {
    const transparentRows = Array.from({ length: 16 }, () => '.'.repeat(16))
    const result = parseAiImportedConfig(
      JSON.stringify({ kind: 'pixels', size: 16, palette: {}, rows: transparentRows })
    )
    expect(result.ok).toBe(true)
    if (!result.ok || result.config.kind !== 'pixels') return
    const rows = result.config.rows
    // 顔マスク外 (row0-3, row10-11) は変化しない
    expect(rows[0]).toBe('.'.repeat(16))
    expect(rows[3]).toBe('.'.repeat(16))
    expect(rows[10]).toBe('.'.repeat(16))
    expect(rows[11]).toBe('.'.repeat(16))
    // 顔マスク行 (row4-9): col4-11 が palette 不在フォールバックの 's' で充填される
    for (let r = 4; r <= 9; r++) {
      expect(rows[r]).toBe('....ssssssss....')
    }
    // 体マスク行 (row12-15): 全列が palette 不在フォールバックの 'o' で充填される
    for (let r = 12; r <= 15; r++) {
      expect(rows[r]).toBe('o'.repeat(16))
    }
  })
})
