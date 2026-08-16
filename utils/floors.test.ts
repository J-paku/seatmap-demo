import { describe, it, expect } from 'vitest'
import { FLOORS, DEFAULT_FLOOR_ID, isFloorId, floorNameOf } from '@/utils/floors'

describe('FLOORS', () => {
  it('lists the two known floors in display order', () => {
    expect(FLOORS).toEqual([
      { floorId: 'floor-1', floorName: '本社1F' },
      { floorId: 'floor-2', floorName: '本社2F' },
    ])
  })
})

describe('DEFAULT_FLOOR_ID', () => {
  it('is the first floor in FLOORS', () => {
    expect(DEFAULT_FLOOR_ID).toBe('floor-1')
  })
})

describe('isFloorId', () => {
  it('accepts every known floor id', () => {
    expect(isFloorId('floor-1')).toBe(true)
    expect(isFloorId('floor-2')).toBe(true)
  })

  it('rejects an unknown id', () => {
    expect(isFloorId('floor-3')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isFloorId('')).toBe(false)
  })

  it('is case-sensitive', () => {
    expect(isFloorId('FLOOR-1')).toBe(false)
  })
})

describe('floorNameOf', () => {
  it('resolves floor-1 to its display name', () => {
    expect(floorNameOf('floor-1')).toBe('本社1F')
  })

  it('resolves floor-2 to its display name', () => {
    expect(floorNameOf('floor-2')).toBe('本社2F')
  })

  it('falls back to the default floor name for an unknown id', () => {
    expect(floorNameOf('floor-99')).toBe('本社1F')
  })

  it('falls back to the default floor name for an empty string', () => {
    expect(floorNameOf('')).toBe('本社1F')
  })
})
