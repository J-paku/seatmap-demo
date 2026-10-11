import { describe, it, expect } from 'vitest'
import { resolveDefaultPresetId } from '@/utils/avatar/default-preset'
import { PIXEL_AVATAR_PRESETS, DEFAULT_AVATAR_PRESET_ID } from '@/utils/avatar/pixel-avatar-presets'

describe('default-preset', () => {
  it('should return a valid preset ID for any seed', () => {
    const testSeeds = ['', 'emp-001', 'emp-002', 'unknown-seed', 'a', 'z']
    testSeeds.forEach((seed) => {
      const result = resolveDefaultPresetId(seed)
      expect(PIXEL_AVATAR_PRESETS[result]).toBeDefined()
    })
  })

  it('should be deterministic for the same seed', () => {
    const seed = 'emp-001'
    const result1 = resolveDefaultPresetId(seed)
    const result2 = resolveDefaultPresetId(seed)
    expect(result1).toBe(result2)
  })

  it('should distribute seeds across available presets', () => {
    const seeds = Array.from({ length: 100 }, (_, i) => `emp-${i.toString().padStart(3, '0')}`)
    const results = seeds.map((seed) => resolveDefaultPresetId(seed))
    const uniquePresets = new Set(results)
    expect(uniquePresets.size).toBeGreaterThan(1)
  })

  it('should return default preset when all presets are available', () => {
    const result = resolveDefaultPresetId('seed-1')
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
  })
})
