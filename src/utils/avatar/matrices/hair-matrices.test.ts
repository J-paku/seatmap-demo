import { describe, it, expect } from 'vitest'
import { HAIR_MATRICES } from '@/utils/avatar/matrices/hair-matrices'

describe('hair-matrices', () => {
  it('should have all matrices as 8x8 grids', () => {
    Object.entries(HAIR_MATRICES).forEach(([hairId, matrix]) => {
      expect(matrix.length).toBe(8)
      matrix.forEach((row, rowIdx) => {
        expect(row.length, `${hairId} row ${rowIdx} has wrong length`).toBe(8)
      })
    })
  })

  it('should only contain null or "hair" strings', () => {
    Object.entries(HAIR_MATRICES).forEach(([hairId, matrix]) => {
      matrix.forEach((row) => {
        row.forEach((cell) => {
          expect([null, 'hair']).toContain(cell)
        })
      })
    })
  })

  it('should have no duplicate hair IDs', () => {
    const ids = Object.keys(HAIR_MATRICES)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('should have at least one hair variant', () => {
    expect(Object.keys(HAIR_MATRICES).length).toBeGreaterThan(0)
  })
})
