import { describe, it, expect } from 'vitest'
import type { FurnitureKind } from '@/types'
import {
  FURNITURE_KIND_LABEL,
  FURNITURE_DEFAULT_SIZE,
  isStructuralKind,
  FURNITURE_LIBRARY_GROUPS,
  defaultFurnitureName,
} from '@/utils/furniture-catalog'

describe('furniture-catalog', () => {
  describe('FURNITURE_KIND_LABEL', () => {
    it('should have labels for all kinds', () => {
      const kinds = Object.keys(FURNITURE_KIND_LABEL)
      expect(kinds.length).toBeGreaterThan(0)
    })

    it('should have no empty labels', () => {
      Object.entries(FURNITURE_KIND_LABEL).forEach(([_kind, label]) => {
        expect(label).toBeTruthy()
        expect(typeof label).toBe('string')
      })
    })

    it('should have no duplicate label values', () => {
      const labels = Object.values(FURNITURE_KIND_LABEL)
      expect(new Set(labels).size).toBe(labels.length)
    })
  })

  describe('FURNITURE_DEFAULT_SIZE', () => {
    it('should have size for all kinds', () => {
      const kinds = Object.keys(FURNITURE_DEFAULT_SIZE)
      const labelKinds = Object.keys(FURNITURE_KIND_LABEL)
      expect(kinds.sort()).toEqual(labelKinds.sort())
    })

    it('should have positive width and height', () => {
      Object.entries(FURNITURE_DEFAULT_SIZE).forEach(([_kind, size]) => {
        expect(size.width).toBeGreaterThan(0)
        expect(size.height).toBeGreaterThan(0)
      })
    })

    it('should have consistent dimensions structure', () => {
      Object.entries(FURNITURE_DEFAULT_SIZE).forEach(([_kind, size]) => {
        expect(typeof size.width).toBe('number')
        expect(typeof size.height).toBe('number')
      })
    })
  })

  describe('isStructuralKind', () => {
    it('should identify structural kinds correctly', () => {
      // wall, column, stairs, door, window are structural
      expect(isStructuralKind('wall')).toBe(true)
      expect(isStructuralKind('column')).toBe(true)
      expect(isStructuralKind('stairs')).toBe(true)
      expect(isStructuralKind('door')).toBe(true)
      expect(isStructuralKind('window')).toBe(true)
    })

    it('should identify object kinds correctly', () => {
      // sofa, table, shelf, plant, bed are objects
      expect(isStructuralKind('sofa')).toBe(false)
      expect(isStructuralKind('table')).toBe(false)
      expect(isStructuralKind('shelf')).toBe(false)
      expect(isStructuralKind('plant')).toBe(false)
      expect(isStructuralKind('bed')).toBe(false)
    })
  })

  describe('FURNITURE_LIBRARY_GROUPS', () => {
    it('should have at least one group', () => {
      expect(FURNITURE_LIBRARY_GROUPS.length).toBeGreaterThan(0)
    })

    it('should have labels and kinds in each group', () => {
      FURNITURE_LIBRARY_GROUPS.forEach((group) => {
        expect(group.label).toBeTruthy()
        expect(Array.isArray(group.kinds)).toBe(true)
        expect(group.kinds.length).toBeGreaterThan(0)
      })
    })

    it('should partition all kinds across groups', () => {
      const allKinds = new Set<string>()
      const labelKinds = new Set(Object.keys(FURNITURE_KIND_LABEL))

      FURNITURE_LIBRARY_GROUPS.forEach((group) => {
        group.kinds.forEach((kind) => {
          allKinds.add(kind as string)
        })
      })

      expect(allKinds.size).toBe(labelKinds.size)
    })

    it('should have no duplicate kinds across groups', () => {
      const allKinds: string[] = []
      FURNITURE_LIBRARY_GROUPS.forEach((group) => {
        group.kinds.forEach((kind) => {
          allKinds.push(kind as string)
        })
      })
      expect(new Set(allKinds).size).toBe(allKinds.length)
    })
  })

  describe('defaultFurnitureName', () => {
    it('should return empty string for structural kinds', () => {
      expect(defaultFurnitureName('wall')).toBe('')
      expect(defaultFurnitureName('column')).toBe('')
      expect(defaultFurnitureName('stairs')).toBe('')
    })

    it('should return label for object kinds', () => {
      expect(defaultFurnitureName('sofa')).toBe(FURNITURE_KIND_LABEL.sofa)
      expect(defaultFurnitureName('table')).toBe(FURNITURE_KIND_LABEL.table)
      expect(defaultFurnitureName('plant')).toBe(FURNITURE_KIND_LABEL.plant)
    })

    it('should be consistent with isStructuralKind', () => {
      Object.keys(FURNITURE_KIND_LABEL).forEach((kind) => {
        const name = defaultFurnitureName(kind as FurnitureKind)
        const isStructural = isStructuralKind(kind as FurnitureKind)
        if (isStructural) {
          expect(name).toBe('')
        } else {
          expect(name).not.toBe('')
        }
      })
    })
  })
})
