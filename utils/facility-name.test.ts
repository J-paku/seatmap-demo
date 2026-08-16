import { describe, it, expect } from 'vitest'
import type { Facility, ScheduleEvent } from '@/types'
import { SELF_EMPLOYEE_ID } from '@/utils/demo-identity'
import { facilityNameByFacilityId, visibleFacilityName } from '@/utils/facility-name'

const meetingFacility: Facility = {
  id: 'facility-1',
  name: '第一会議室',
  kind: 'meeting',
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  facilityId: 'sys-facility-1',
}

const unlinkedFacility: Facility = {
  id: 'facility-2',
  name: '休憩スペース',
  kind: 'common',
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  // facilityId not set: not linked to the schedule system
}

describe('facilityNameByFacilityId', () => {
  it('maps facilityId -> name for facilities that have a facilityId', () => {
    const map = facilityNameByFacilityId([meetingFacility])
    expect(map.get('sys-facility-1')).toBe('第一会議室')
  })

  it('excludes facilities without a facilityId', () => {
    const map = facilityNameByFacilityId([unlinkedFacility])
    expect(map.size).toBe(0)
  })

  it('returns an empty map for an empty facility list', () => {
    expect(facilityNameByFacilityId([]).size).toBe(0)
  })

  it('lets a later facility with the same facilityId overwrite an earlier one', () => {
    const duplicate: Facility = { ...meetingFacility, id: 'facility-3', name: '第一会議室(改)' }
    const map = facilityNameByFacilityId([meetingFacility, duplicate])
    expect(map.get('sys-facility-1')).toBe('第一会議室(改)')
    expect(map.size).toBe(1)
  })

  it('mixes linked and unlinked facilities correctly', () => {
    const map = facilityNameByFacilityId([meetingFacility, unlinkedFacility])
    expect(map.size).toBe(1)
    expect(map.has('sys-facility-1')).toBe(true)
  })
})

const baseEvent: ScheduleEvent = {
  id: 'ev1',
  employeeId: 'emp-002',
  title: '定例会議',
  category: 'meeting',
  start: '2026-08-16T09:00:00+09:00',
  end: '2026-08-16T10:00:00+09:00',
  isAllDay: false,
  facilityId: 'sys-facility-1',
}

describe('visibleFacilityName', () => {
  it('returns the facility name for a non-masked event', () => {
    expect(visibleFacilityName(baseEvent, '第一会議室')).toBe('第一会議室')
  })

  it('hides the facility name for a private event belonging to someone else', () => {
    const privateEvent: ScheduleEvent = { ...baseEvent, isPrivate: true }
    expect(visibleFacilityName(privateEvent, '第一会議室')).toBeUndefined()
  })

  it('does not hide the facility name for the self employee’s own private event', () => {
    const ownPrivateEvent: ScheduleEvent = { ...baseEvent, employeeId: SELF_EMPLOYEE_ID, isPrivate: true }
    expect(visibleFacilityName(ownPrivateEvent, '第一会議室')).toBe('第一会議室')
  })

  it('passes through undefined when the event is not masked but has no resolved name', () => {
    expect(visibleFacilityName(baseEvent, undefined)).toBeUndefined()
  })
})
