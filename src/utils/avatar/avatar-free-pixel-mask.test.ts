import { describe, it, expect } from 'vitest'
import { normalizeFreePixelRows } from '@/utils/avatar/avatar-free-pixel-mask'

describe('avatar-free-pixel-mask', () => {
  it('should preserve row count when normalizing', () => {
    const rows = Array(16).fill('................')
    const palette = { skin: '#F0C49A', outfit: '#3B6EA8' }
    const result = normalizeFreePixelRows(rows, palette)
    expect(result.length).toBe(16)
  })

  it('should preserve non-empty rows after normalization', () => {
    const rows = Array(16).fill('................')
    const palette = { skin: '#F0C49A', outfit: '#3B6EA8' }
    const result = normalizeFreePixelRows(rows, palette)
    result.forEach((row, idx) => {
      expect(typeof row).toBe('string')
      expect(row.length).toBeGreaterThan(0)
    })
  })

  it('should return an array of strings', () => {
    const rows = Array(16).fill('................')
    const palette = { skin: '#F0C49A', outfit: '#3B6EA8' }
    const result = normalizeFreePixelRows(rows, palette)
    expect(Array.isArray(result)).toBe(true)
    result.forEach((row) => {
      expect(typeof row).toBe('string')
    })
  })

  it('should handle fully transparent face mask', () => {
    const rows = [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ]
    const palette = { skin: '#F0C49A', outfit: '#3B6EA8' }
    const result = normalizeFreePixelRows(rows, palette)
    expect(result).toBeDefined()
    expect(result.length).toBe(16)
  })

  it('should handle empty palette gracefully', () => {
    const rows = Array(16).fill('................')
    const palette = {}
    const result = normalizeFreePixelRows(rows, palette)
    expect(result).toBeDefined()
  })

  it('should not modify rows with sufficient fill', () => {
    const rows = Array(16).fill('ssssssssoooooooo')
    const palette = { s: '#F0C49A', o: '#3B6EA8' }
    const result = normalizeFreePixelRows(rows, palette)
    expect(result.join('')).toBe(rows.join(''))
  })
})
