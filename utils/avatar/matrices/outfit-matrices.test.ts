import { describe, it, expect } from 'vitest'
import { OUTFIT_MATRICES } from '@/utils/avatar/matrices/outfit-matrices'

describe('outfit-matrices', () => {
  it('should have all matrices as 8x8 grids', () => {
    Object.entries(OUTFIT_MATRICES).forEach(([outfitId, matrix]) => {
      expect(matrix.length).toBe(8)
      matrix.forEach((row, rowIdx) => {
        expect(row.length, `${outfitId} row ${rowIdx} has wrong length`).toBe(8)
      })
    })
  })

  it('should only contain null, "outfit", "outfitDark", or "outfitAlt" strings', () => {
    Object.entries(OUTFIT_MATRICES).forEach(([outfitId, matrix]) => {
      matrix.forEach((row) => {
        row.forEach((cell) => {
          expect([null, 'outfit', 'outfitDark', 'outfitAlt']).toContain(cell)
        })
      })
    })
  })

  it('should have no duplicate outfit IDs', () => {
    const ids = Object.keys(OUTFIT_MATRICES)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('should have at least one outfit variant', () => {
    expect(Object.keys(OUTFIT_MATRICES).length).toBeGreaterThan(0)
  })
})
