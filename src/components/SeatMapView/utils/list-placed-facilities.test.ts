import { describe, it, expect } from 'vitest'
import { placedFacilityIdsOf } from './list-placed-facilities'
import type { Facility, SeatLayout } from '@/types'

const facilityOf = (id: string, facilityId?: string): Facility => ({
  id,
  name: id,
  kind: 'meeting',
  x: 0,
  y: 0,
  width: 200,
  height: 150,
  facilityId,
})

const layoutOf = (facilities: Facility[]): SeatLayout => ({
  floorId: 'floor-1',
  floorName: '1F',
  viewBox: { width: 1920, height: 1080 },
  seats: [],
  teams: [],
  facilities,
  furniture: [],
})

describe('placedFacilityIdsOf', () => {
  it('予定システムの施設IDを置いた順に並べる(レイアウト上の id ではない)', () => {
    const layout = layoutOf([facilityOf('fac-1', 'F-02'), facilityOf('fac-2', 'F-01')])
    expect(placedFacilityIdsOf(layout)).toEqual(['F-02', 'F-01'])
  })

  it('施設IDを持たない未連携の会議室は数えない', () => {
    const layout = layoutOf([facilityOf('fac-1'), facilityOf('fac-2', 'F-01'), facilityOf('fac-3')])
    expect(placedFacilityIdsOf(layout)).toEqual(['F-01'])
  })

  it('会議室が無ければ空', () => {
    expect(placedFacilityIdsOf(layoutOf([]))).toEqual([])
  })

  it('レイアウト未取得なら空', () => {
    expect(placedFacilityIdsOf(undefined)).toEqual([])
  })
})
