import { describe, it, expect } from 'vitest'
import { siblingRectsForObject } from './sibling-rects'
import type { SeatLayout } from '@/types'

const layout: SeatLayout = {
  floorId: 'f1',
  floorName: 'Floor 1',
  viewBox: { width: 1600, height: 1154 },
  seats: [
    {
      id: 'team-a-001',
      teamId: 'team-a',
      x: 20,
      y: 30,
      width: 60,
      height: 40,
      rotation: 0,
      employeeId: null,
    },
  ],
  teams: [
    {
      id: 'team-a',
      idPrefix: 'team-a',
      name: 'チームA',
      color: '#ff0000',
      area: { x: 10, y: 20, w: 300, h: 200 },
    },
  ],
  facilities: [
    { id: 'fac-1', name: '会議室1', kind: 'meeting', x: 400, y: 50, width: 120, height: 90 },
  ],
  furniture: [{ id: 'furn-1', kind: 'sofa', name: 'ソファ', x: 600, y: 5, width: 40, height: 30 }],
}

const teamRect = { x: 10, y: 20, w: 300, h: 200 }
const facilityRect = { x: 400, y: 50, w: 120, h: 90 }
const furnitureRect = { x: 600, y: 5, w: 40, h: 30 }

describe('siblingRectsForObject', () => {
  it('チーム枠・会議室・家具の矩形を返し、座席は候補に入れない', () => {
    expect(siblingRectsForObject(layout, null)).toEqual([teamRect, facilityRect, furnitureRect])
  })

  it('動かしている会議室自身は候補から除く', () => {
    expect(siblingRectsForObject(layout, { kind: 'facility', id: 'fac-1' })).toEqual([
      teamRect,
      furnitureRect,
    ])
  })

  it('動かしている家具自身は候補から除く', () => {
    expect(siblingRectsForObject(layout, { kind: 'furniture', id: 'furn-1' })).toEqual([
      teamRect,
      facilityRect,
    ])
  })

  it('チーム枠を self にすればそのチーム枠を除く', () => {
    expect(siblingRectsForObject(layout, { kind: 'team', id: 'team-a' })).toEqual([
      facilityRect,
      furnitureRect,
    ])
  })

  it('レイアウトが空なら候補も空', () => {
    const empty: SeatLayout = { ...layout, teams: [], facilities: [], furniture: [] }
    expect(siblingRectsForObject(empty, null)).toEqual([])
  })
})
