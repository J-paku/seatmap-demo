import { describe, it, expect } from 'vitest'
import { GAROON_SCHEDULE_EVENTS_PATH } from './schedule'
import { GAROON_FACILITY_MASTER } from './facilities'
import schedulesJson from '../../mocks/schedules.json'

describe('GAROON_SCHEDULE_EVENTS_PATH', () => {
  it('REST の予定取得エンドポイントのパスを持つ', () => {
    expect(GAROON_SCHEDULE_EVENTS_PATH).toBe('/api/v1/schedule/events')
  })

  it('絶対パス表記(先頭スラッシュ)である', () => {
    expect(GAROON_SCHEDULE_EVENTS_PATH.startsWith('/')).toBe(true)
  })
})

describe('mocks/schedules.json との契約(施設を押さえた予定の facilityId)', () => {
  it('facilityId を持つ予定は全て GAROON_FACILITY_MASTER に登録済みの施設IDを指す', () => {
    const masterIds = new Set(GAROON_FACILITY_MASTER.map((f) => f.facilityId))
    const withFacility = schedulesJson.filter(
      (event): event is typeof event & { facilityId: string } =>
        typeof (event as { facilityId?: string }).facilityId === 'string'
    )
    expect(withFacility.length).toBeGreaterThan(0)
    withFacility.forEach((event) => {
      expect(masterIds.has(event.facilityId)).toBe(true)
    })
  })

  it('category が meeting でない予定(out/vacation)は facilityId を持たない', () => {
    schedulesJson
      .filter((event) => event.category !== 'meeting')
      .forEach((event) => {
        expect((event as { facilityId?: string }).facilityId).toBeUndefined()
      })
  })
})
