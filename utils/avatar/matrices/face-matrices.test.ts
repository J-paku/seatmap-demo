import { describe, it, expect } from 'vitest'
import { FACE_MATRICES } from '@/utils/avatar/matrices/face-matrices'

describe('face-matrices', () => {
  it('should have all matrices as 8x8 grids', () => {
    Object.entries(FACE_MATRICES).forEach(([faceId, matrix]) => {
      expect(matrix.length).toBe(8)
      matrix.forEach((row, rowIdx) => {
        expect(row.length, `${faceId} row ${rowIdx} has wrong length`).toBe(8)
      })
    })
  })

  it('should only contain null, "eyes", or "mouth" strings', () => {
    Object.entries(FACE_MATRICES).forEach(([faceId, matrix]) => {
      matrix.forEach((row) => {
        row.forEach((cell) => {
          expect([null, 'eyes', 'mouth']).toContain(cell)
        })
      })
    })
  })

  it('should have no duplicate face IDs', () => {
    const ids = Object.keys(FACE_MATRICES)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('should have at least one face variant', () => {
    expect(Object.keys(FACE_MATRICES).length).toBeGreaterThan(0)
  })
})
