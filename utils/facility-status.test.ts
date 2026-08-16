import { describe, it, expect } from 'vitest'
import { deriveFacilityState, minToHHMM, FACILITY_COLOR, FACILITY_STATUS_LABEL } from './facility-status'
import type { Facility, FacilityMeeting, FacilityStatus } from '@/types'

const facility: Facility = {
  id: 'fac-1',
  name: '会議室A',
  kind: 'meeting',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  facilityId: 'facility-linked-1',
}

const unlinkedFacility: Facility = { ...facility, facilityId: undefined }

const meeting = (over: Partial<FacilityMeeting>): FacilityMeeting => ({
  id: 'm-1',
  facilityId: 'facility-linked-1',
  title: '定例会議',
  startMin: 600,
  endMin: 660,
  organizerId: 'e1',
  participantIds: ['e1', 'e2'],
  ...over,
})

describe('deriveFacilityState', () => {
  it('facilityId未連携ならunlinked、current/nextは持たない', () => {
    const state = deriveFacilityState(unlinkedFacility, [meeting({})], 620)
    expect(state).toEqual({ status: 'unlinked' })
  })

  it('進行中の会議があればin_meetingで、current/nextを共に返す', () => {
    const current = meeting({ id: 'cur', startMin: 600, endMin: 660 })
    const next = meeting({ id: 'nxt', startMin: 700, endMin: 730 })
    const state = deriveFacilityState(facility, [next, current], 620)
    expect(state.status).toBe('in_meeting')
    expect(state.current).toEqual(current)
    expect(state.next).toEqual(next)
  })

  it('境界: startMinちょうどは進行中に含まれる(開始含む)', () => {
    const current = meeting({ id: 'cur', startMin: 600, endMin: 660 })
    const state = deriveFacilityState(facility, [current], 600)
    expect(state.status).toBe('in_meeting')
    expect(state.current).toEqual(current)
  })

  it('境界: endMinちょうどは進行中に含まれない(終了は含まない)', () => {
    const current = meeting({ id: 'cur', startMin: 600, endMin: 660 })
    const state = deriveFacilityState(facility, [current], 660)
    expect(state).toEqual({ status: 'available', next: undefined })
  })

  it('進行中は無いが30分以内に次の会議があればupcoming', () => {
    const next = meeting({ id: 'nxt', startMin: 650, endMin: 700 })
    const state = deriveFacilityState(facility, [next], 620)
    expect(state.status).toBe('upcoming')
    expect(state.next).toEqual(next)
    expect(state.current).toBeUndefined()
  })

  it('境界: 30分後ちょうどの次の会議もupcoming(以下判定)', () => {
    const next = meeting({ id: 'nxt', startMin: 650, endMin: 700 })
    const state = deriveFacilityState(facility, [next], 620)
    expect(next.startMin - 620).toBe(30)
    expect(state.status).toBe('upcoming')
  })

  it('境界: 31分後の次の会議はavailable扱い', () => {
    const next = meeting({ id: 'nxt', startMin: 651, endMin: 700 })
    const state = deriveFacilityState(facility, [next], 620)
    expect(next.startMin - 620).toBe(31)
    expect(state.status).toBe('available')
    expect(state.next).toEqual(next)
  })

  it('進行中も直近予定も無ければavailableでnextはundefined', () => {
    const state = deriveFacilityState(facility, [], 620)
    expect(state).toEqual({ status: 'available', next: undefined })
  })

  it('他施設の会議は無視する', () => {
    const other = meeting({ id: 'other', facilityId: 'other-facility', startMin: 600, endMin: 660 })
    const state = deriveFacilityState(facility, [other], 620)
    expect(state.status).toBe('available')
  })

  it('未ソートの入力でも内部でstartMin昇順に並べてcurrent/nextを決める', () => {
    const early = meeting({ id: 'early', startMin: 540, endMin: 570 })
    const current = meeting({ id: 'cur', startMin: 600, endMin: 660 })
    const late = meeting({ id: 'late', startMin: 700, endMin: 730 })
    const state = deriveFacilityState(facility, [late, current, early], 620)
    expect(state.status).toBe('in_meeting')
    expect(state.current).toEqual(current)
    expect(state.next).toEqual(late)
  })
})

describe('minToHHMM', () => {
  it('0分は00:00', () => {
    expect(minToHHMM(0)).toBe('00:00')
  })

  it('端数のある分をHH:MMに変換する', () => {
    expect(minToHHMM(30)).toBe('00:30')
    expect(minToHHMM(90)).toBe('01:30')
    expect(minToHHMM(570)).toBe('09:30')
    expect(minToHHMM(1050)).toBe('17:30')
    expect(minToHHMM(600)).toBe('10:00')
  })
})

describe('FACILITY_COLOR / FACILITY_STATUS_LABEL', () => {
  const statuses: FacilityStatus[] = ['available', 'in_meeting', 'upcoming', 'unlinked']

  it('全FacilityStatusの色定義を持つ', () => {
    for (const status of statuses) {
      expect(FACILITY_COLOR[status]).toBeDefined()
      expect(FACILITY_COLOR[status].bg).toMatch(/^#/)
      expect(FACILITY_COLOR[status].border).toMatch(/^#/)
      expect(FACILITY_COLOR[status].text).toMatch(/^#/)
    }
  })

  it('全FacilityStatusの表示ラベルを持つ', () => {
    for (const status of statuses) {
      expect(typeof FACILITY_STATUS_LABEL[status]).toBe('string')
      expect(FACILITY_STATUS_LABEL[status].length).toBeGreaterThan(0)
    }
  })
})
