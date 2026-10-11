import { describe, it, expect } from 'vitest'
import { findHoverFacility } from './find-hover-facility'
import type { FacilityState } from '@/utils/facility-status'
import type { Facility } from '@/types'

const facilityOf = (id: string): Facility => ({
  id,
  name: id,
  kind: 'meeting',
  x: 0,
  y: 0,
  width: 200,
  height: 150,
})

const FACILITIES = [facilityOf('fac-1'), facilityOf('fac-2')]
const AVAILABLE: FacilityState = { status: 'available' }
const IN_MEETING: FacilityState = { status: 'in_meeting' }
const STATES = new Map([
  ['fac-1', AVAILABLE],
  ['fac-2', IN_MEETING],
  ['fac-9', AVAILABLE],
])

describe('findHoverFacility', () => {
  it('ホバー中の会議室とその状態を組にして返す', () => {
    expect(findHoverFacility(FACILITIES, STATES, 'fac-2')).toEqual({
      facility: FACILITIES[1],
      state: IN_MEETING,
    })
  })

  it('レイアウトに無い会議室は、状態だけ残っていても null', () => {
    expect(findHoverFacility(FACILITIES, STATES, 'fac-9')).toBeNull()
  })

  it('状態を引けない会議室は、レイアウトに在っても null', () => {
    expect(findHoverFacility(FACILITIES, new Map([['fac-2', IN_MEETING]]), 'fac-1')).toBeNull()
  })

  it('会議室も状態も無ければ null', () => {
    expect(findHoverFacility(FACILITIES, STATES, 'fac-0')).toBeNull()
  })
})
