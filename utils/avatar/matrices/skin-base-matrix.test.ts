import { describe, it, expect } from 'vitest'
import { SKIN_BASE_MATRIX } from '@/utils/avatar/matrices/skin-base-matrix'

describe('skin-base-matrix', () => {
  it('should be an 8x8 grid', () => {
    expect(SKIN_BASE_MATRIX.length).toBe(8)
    SKIN_BASE_MATRIX.forEach((row, rowIdx) => {
      expect(row.length, `row ${rowIdx} has wrong length`).toBe(8)
    })
  })

  it('should only contain null or "skin" strings', () => {
    SKIN_BASE_MATRIX.forEach((row) => {
      row.forEach((cell) => {
        expect([null, 'skin']).toContain(cell)
      })
    })
  })

  it('should have the face area (rows 2-4) filled with skin', () => {
    // Rows 2, 3, 4 should have skin in cols 2-5
    for (let r = 2; r <= 4; r++) {
      for (let c = 2; c <= 5; c++) {
        expect(SKIN_BASE_MATRIX[r][c]).toBe('skin')
      }
    }
  })

  it('should have the neck area filled with skin', () => {
    // Row 5 should have skin in cols 1-6
    for (let c = 1; c <= 6; c++) {
      expect(SKIN_BASE_MATRIX[5][c]).toBe('skin')
    }
  })
})
