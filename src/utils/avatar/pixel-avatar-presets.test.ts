import { describe, it, expect } from 'vitest'
import type { PartsAvatarConfig, PixelAvatarPresetId, PixelsAvatarConfig } from '@/types'
import {
  PIXEL_AVATAR_PRESETS,
  DEFAULT_AVATAR_PRESET_ID,
  resolveAvatarConfig,
} from '@/utils/avatar/pixel-avatar-presets'
import { ACCESSORY_MATRICES } from '@/utils/avatar/matrices/accessory-matrices'
import { FACE_MATRICES } from '@/utils/avatar/matrices/face-matrices'
import { HAIR_MATRICES } from '@/utils/avatar/matrices/hair-matrices'
import { OUTFIT_MATRICES } from '@/utils/avatar/matrices/outfit-matrices'

// Hex color validation regex: #RRGGBB
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/

describe('pixel-avatar-presets', () => {
  it('should have at least one preset', () => {
    expect(Object.keys(PIXEL_AVATAR_PRESETS).length).toBeGreaterThan(0)
  })

  it('should have no duplicate preset IDs', () => {
    const ids = Object.keys(PIXEL_AVATAR_PRESETS)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('should have all presets with kind="parts"', () => {
    Object.values(PIXEL_AVATAR_PRESETS).forEach(preset => {
      expect(preset.kind).toBe('parts')
    })
  })

  it('should have all presets with required part IDs', () => {
    Object.entries(PIXEL_AVATAR_PRESETS).forEach(([presetId, preset]) => {
      expect(preset.hair).toBeDefined()
      expect(preset.face).toBeDefined()
      expect(preset.outfit).toBeDefined()
    })
  })

  it('should have all color values as valid hex codes', () => {
    Object.entries(PIXEL_AVATAR_PRESETS).forEach(([presetId, preset]) => {
      Object.entries(preset.palette).forEach(([key, color]) => {
        expect(HEX_COLOR_REGEX.test(color)).toBe(true)
      })
    })
  })

  it('should have at least one color defined for all presets', () => {
    Object.entries(PIXEL_AVATAR_PRESETS).forEach(([presetId, preset]) => {
      expect(Object.keys(preset.palette).length).toBeGreaterThan(0)
    })
  })

  it('DEFAULT_AVATAR_PRESET_ID should reference an existing preset', () => {
    expect(PIXEL_AVATAR_PRESETS[DEFAULT_AVATAR_PRESET_ID]).toBeDefined()
  })

  it('どのプリセットも描ける部品(行列のある ID)だけで組まれている', () => {
    for (const preset of Object.values(PIXEL_AVATAR_PRESETS)) {
      expect(Object.keys(HAIR_MATRICES)).toContain(preset.hair)
      expect(Object.keys(FACE_MATRICES)).toContain(preset.face)
      expect(Object.keys(OUTFIT_MATRICES)).toContain(preset.outfit)
      // アクセサリーは付けないプリセットもある
      expect([undefined, ...Object.keys(ACCESSORY_MATRICES)]).toContain(preset.accessory)
    }
  })
})

describe('resolveAvatarConfig', () => {
  const defaultParts = PIXEL_AVATAR_PRESETS[DEFAULT_AVATAR_PRESET_ID]

  it('設定が無ければ既定のプリセットを返す', () => {
    expect(resolveAvatarConfig(null)).toBe(defaultParts)
    expect(resolveAvatarConfig(undefined)).toBe(defaultParts)
  })

  it('parts の設定はそのまま返す', () => {
    const parts: PartsAvatarConfig = { ...PIXEL_AVATAR_PRESETS.av3, hair: 'bob' }
    expect(resolveAvatarConfig(parts)).toBe(parts)
  })

  it('preset の設定は id のプリセットに展開する', () => {
    expect(resolveAvatarConfig({ kind: 'preset', id: 'av3' })).toBe(PIXEL_AVATAR_PRESETS.av3)
  })

  it('表に無い preset id(localStorage に残った削除済みの id など)は既定のプリセットにする', () => {
    const removedId: string = 'av99'
    const config = { kind: 'preset', id: removedId as PixelAvatarPresetId } as const
    expect(resolveAvatarConfig(config)).toBe(defaultParts)
  })

  it('pixels の設定は部品を持たないので既定のプリセットを返す', () => {
    const pixels: PixelsAvatarConfig = { kind: 'pixels', size: 16, palette: {}, rows: [] }
    expect(resolveAvatarConfig(pixels)).toBe(defaultParts)
  })
})
