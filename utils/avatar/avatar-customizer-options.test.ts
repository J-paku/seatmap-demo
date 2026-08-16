import { describe, it, expect } from 'vitest'
import {
  QUICK_START_PRESETS,
  HAIR_COLOR_OPTIONS,
  OUTFIT_COLOR_OPTIONS,
  PALETTE_OPTIONS,
  normalizeHairId,
  getExclusiveHairQuickStart,
} from '@/utils/avatar/avatar-customizer-options'

// Hex color validation regex: #RRGGBB
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/

describe('avatar-customizer-options', () => {
  describe('QUICK_START_PRESETS', () => {
    it('should have male and female presets', () => {
      expect(QUICK_START_PRESETS.male).toBeDefined()
      expect(QUICK_START_PRESETS.female).toBeDefined()
    })

    it('should have all required fields in each preset', () => {
      Object.entries(QUICK_START_PRESETS).forEach(([kind, preset]) => {
        expect(preset.hair).toBeDefined()
        expect(preset.face).toBeDefined()
        expect(preset.accessory).toBeDefined()
        expect(preset.outfit).toBeDefined()
        expect(preset.paletteId).toBeDefined()
        expect(preset.kind).toBe(kind)
      })
    })

    it('should have no duplicate kinds', () => {
      const kinds = Object.keys(QUICK_START_PRESETS)
      expect(new Set(kinds).size).toBe(kinds.length)
    })
  })

  describe('color options', () => {
    it('HAIR_COLOR_OPTIONS should have valid hex colors', () => {
      HAIR_COLOR_OPTIONS.forEach((color) => {
        expect(HEX_COLOR_REGEX.test(color)).toBe(true)
      })
    })

    it('HAIR_COLOR_OPTIONS should have at least one color', () => {
      expect(HAIR_COLOR_OPTIONS.length).toBeGreaterThan(0)
    })

    it('OUTFIT_COLOR_OPTIONS should have valid hex colors', () => {
      OUTFIT_COLOR_OPTIONS.forEach((color) => {
        expect(HEX_COLOR_REGEX.test(color)).toBe(true)
      })
    })

    it('OUTFIT_COLOR_OPTIONS should have at least one color', () => {
      expect(OUTFIT_COLOR_OPTIONS.length).toBeGreaterThan(0)
    })
  })

  describe('PALETTE_OPTIONS', () => {
    it('should have at least one preset ID', () => {
      expect(PALETTE_OPTIONS.length).toBeGreaterThan(0)
    })

    it('should have no duplicate IDs', () => {
      expect(new Set(PALETTE_OPTIONS).size).toBe(PALETTE_OPTIONS.length)
    })
  })

  describe('normalizeHairId', () => {
    it('should convert "afro" to "neatBob"', () => {
      expect(normalizeHairId('afro')).toBe('neatBob')
    })

    it('should pass through other hair IDs unchanged', () => {
      expect(normalizeHairId('short')).toBe('short')
      expect(normalizeHairId('long')).toBe('long')
    })
  })

  describe('getExclusiveHairQuickStart', () => {
    it('should return null for shared hairstyles', () => {
      const result = getExclusiveHairQuickStart('short')
      expect([null, 'male', 'female']).toContain(result)
    })

    it('should return null or a valid quick start kind', () => {
      const result = getExclusiveHairQuickStart('short')
      expect(['male', 'female', null]).toContain(result)
    })
  })
})
