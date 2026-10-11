import { describe, it, expect } from 'vitest'
import { ACCESSORY_MATRICES } from '@/utils/avatar/matrices/accessory-matrices'

describe('accessory-matrices', () => {
  it('should have all matrices as 8x8 grids', () => {
    Object.entries(ACCESSORY_MATRICES).forEach(([accessoryId, matrix]) => {
      expect(matrix.length).toBe(8)
      matrix.forEach((row, rowIdx) => {
        expect(row.length, `${accessoryId} row ${rowIdx} has wrong length`).toBe(8)
      })
    })
  })

  it('should only contain null or "accessory" strings', () => {
    Object.entries(ACCESSORY_MATRICES).forEach(([accessoryId, matrix]) => {
      matrix.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          expect([null, 'accessory']).toContain(cell)
        })
      })
    })
  })

  it('should have no duplicate accessory IDs', () => {
    const ids = Object.keys(ACCESSORY_MATRICES)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('should have at least one accessory variant', () => {
    expect(Object.keys(ACCESSORY_MATRICES).length).toBeGreaterThan(0)
  })
})
