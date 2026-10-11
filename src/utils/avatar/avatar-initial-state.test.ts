import { describe, it, expect } from 'vitest'
import type { HairId } from '@/types'
import { deriveInitialQuickStartKind, deriveInitialParts } from './avatar-initial-state'
import { PIXEL_AVATAR_PRESETS } from './pixel-avatar-presets'
import { PALETTE_OPTIONS, HAIR_OPTIONS, FACE_OPTIONS, ACCESSORY_OPTIONS, OUTFIT_OPTIONS } from './avatar-customizer-options'

describe('deriveInitialQuickStartKind', () => {
  it('initialConfig が無く、髪型が male 専用グループなら male を返す', () => {
    expect(deriveInitialQuickStartKind(null, 'mohawk')).toBe('male')
  })

  it('initialConfig が無く、髪型が female 専用グループなら female を返す', () => {
    expect(deriveInitialQuickStartKind(undefined, 'bob')).toBe('female')
  })

  it('initialConfig が無く、髪型が common グループなら既定の male を返す', () => {
    expect(deriveInitialQuickStartKind(null, 'short')).toBe('male')
  })

  it('kind:preset で QUICK_START_PRESETS.female の paletteId (av4) と一致すれば female を返す (髪型より優先)', () => {
    // hair には male 専用の髪型を渡しても、preset 一致が優先されることを確認する
    expect(deriveInitialQuickStartKind({ kind: 'preset', id: 'av4' }, 'mohawk')).toBe('female')
  })

  it('kind:preset で QUICK_START_PRESETS.male の paletteId (av1) と一致すれば male を返す', () => {
    expect(deriveInitialQuickStartKind({ kind: 'preset', id: 'av1' }, 'bob')).toBe('male')
  })

  it('kind:preset だが QUICK_START_PRESETS のどの paletteId とも一致しなければ髪型判定にフォールバックする', () => {
    expect(deriveInitialQuickStartKind({ kind: 'preset', id: 'av2' }, 'twintail')).toBe('female')
  })

  it('kind:parts の場合は preset 判定をスキップし髪型で判定する', () => {
    expect(
      deriveInitialQuickStartKind(
        { kind: 'parts', hair: 'garou', face: 'slit', outfit: 'solid', palette: PIXEL_AVATAR_PRESETS.av1.palette },
        'garou'
      )
    ).toBe('male')
  })
})

describe('deriveInitialParts', () => {
  it('initialConfig が無い場合は各カテゴリの先頭選択肢 + PALETTE_OPTIONS[0] のパレットで初期化する', () => {
    const result = deriveInitialParts(null)
    expect(result.paletteId).toBe(PALETTE_OPTIONS[0])
    expect(result.hairColor).toBeNull()
    expect(result.outfitColor).toBeNull()
    expect(result.parts).toEqual({
      kind: 'parts',
      hair: HAIR_OPTIONS[0],
      face: FACE_OPTIONS[0],
      accessory: ACCESSORY_OPTIONS[0],
      outfit: OUTFIT_OPTIONS[0],
      palette: PIXEL_AVATAR_PRESETS[PALETTE_OPTIONS[0]].palette,
    })
  })

  it('kind:preset を渡すと該当プリセットへ解決され、paletteId は preset.id になり色上書きは無い (av6)', () => {
    const result = deriveInitialParts({ kind: 'preset', id: 'av6' })
    expect(result.paletteId).toBe('av6')
    expect(result.hairColor).toBeNull()
    expect(result.outfitColor).toBeNull()
    expect(result.parts).toEqual({
      ...PIXEL_AVATAR_PRESETS.av6,
      hair: 'bald', // normalizeHairId('bald') は変化しない
    })
  })

  it('kind:parts で "afro" (旧ID) を渡すと neatBob に正規化される', () => {
    // 'afro' は型定義 (HairId) からは削除済みの旧ID。過去に保存されたデータの残存を
    // 模すため、いったん string として保持してから HairId へキャストする(any/unknown 経由なし)
    const legacyHairId: string = 'afro'
    const result = deriveInitialParts({
      kind: 'parts',
      hair: legacyHairId as HairId,
      face: 'smile',
      outfit: 'solid',
      palette: { hair: '#111111', skin: '#F0C49A', outfit: '#3B6EA8', outfitDark: '#2C4F7A' },
    })
    expect(result.parts.hair).toBe('neatBob')
  })

  it('kind:parts のパレットがどのプリセットとも一致しない場合、paletteId は av1 (先頭) にフォールバックし、色差分は hairColor/outfitColor に反映される', () => {
    const result = deriveInitialParts({
      kind: 'parts',
      hair: 'short',
      face: 'slit',
      outfit: 'solid',
      palette: { hair: '#111111', skin: '#F0C49A', outfit: '#123456', outfitDark: '#2C4F7A' },
    })
    expect(result.paletteId).toBe('av1')
    expect(result.hairColor).toBe('#111111')
    expect(result.outfitColor).toBe('#123456')
  })

  it('kind:parts のパレットが既存プリセット (av2) と hair/outfit 完全一致する場合、そのプリセットに紐付き色上書きは無い', () => {
    const av2Palette = PIXEL_AVATAR_PRESETS.av2.palette
    const result = deriveInitialParts({
      kind: 'parts',
      hair: 'short',
      face: 'slit',
      outfit: 'solid',
      palette: { ...av2Palette },
    })
    expect(result.paletteId).toBe('av2')
    expect(result.hairColor).toBeNull()
    expect(result.outfitColor).toBeNull()
  })
})
