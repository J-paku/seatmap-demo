import { describe, it, expect } from 'vitest'
import { PIXEL_AVATAR_PRESETS, DEFAULT_AVATAR_PRESET_ID } from '@/utils/avatar/pixel-avatar-presets'

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
    Object.values(PIXEL_AVATAR_PRESETS).forEach((preset) => {
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
})
