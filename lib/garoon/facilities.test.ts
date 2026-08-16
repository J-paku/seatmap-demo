import { describe, it, expect } from 'vitest'
import { GAROON_FACILITY_MASTER, isGaroonConnected } from './facilities'
import facilitiesJson from '../../mocks/facilities.json'
import facilitiesFloor2Json from '../../mocks/floor-2/facilities.json'

describe('isGaroonConnected', () => {
  it('DECISION D3: デモは接続済み固定なので常に true を返す', () => {
    expect(isGaroonConnected()).toBe(true)
    expect(isGaroonConnected()).toBe(true)
  })
})

describe('GAROON_FACILITY_MASTER', () => {
  it('facilityId は重複しない', () => {
    const ids = GAROON_FACILITY_MASTER.map((f) => f.facilityId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('全件が facilityId / name / kana の文字列を持つ', () => {
    GAROON_FACILITY_MASTER.forEach((facility) => {
      expect(typeof facility.facilityId).toBe('string')
      expect(facility.facilityId.length).toBeGreaterThan(0)
      expect(typeof facility.name).toBe('string')
      expect(facility.name.length).toBeGreaterThan(0)
      expect(typeof facility.kana).toBe('string')
      expect(facility.kana.length).toBeGreaterThan(0)
    })
  })

  it('kana は全角カタカナ(長音符含む)のみで構成される(五十音ソート用の鍵)', () => {
    GAROON_FACILITY_MASTER.forEach((facility) => {
      expect(facility.kana).toMatch(/^[ァ-ヶー]+$/)
    })
  })

  it('F-05 は「施設未連携」デモとして番号だけ消費し、マスタには存在しない', () => {
    const ids = GAROON_FACILITY_MASTER.map((f) => f.facilityId)
    expect(ids).not.toContain('F-05')
  })

  it('地図に既に置かれている facilityId(mocks/facilities.json 由来)は全てマスタに存在する', () => {
    const placedIds = [...facilitiesJson, ...facilitiesFloor2Json]
      .map((f) => (f as { facilityId?: string }).facilityId)
      .filter((id): id is string => id !== undefined)
    const masterIds = new Set(GAROON_FACILITY_MASTER.map((f) => f.facilityId))
    expect(placedIds.length).toBeGreaterThan(0)
    placedIds.forEach((id) => {
      expect(masterIds.has(id)).toBe(true)
    })
  })

  it('未配置の施設(F-08以降)を含み、マスタは配置済み集合の真の上位集合になっている(ピッカーに残りがある)', () => {
    const placedIds = new Set(
      [...facilitiesJson, ...facilitiesFloor2Json]
        .map((f) => (f as { facilityId?: string }).facilityId)
        .filter((id): id is string => id !== undefined)
    )
    const unplaced = GAROON_FACILITY_MASTER.filter((f) => !placedIds.has(f.facilityId))
    expect(unplaced.length).toBeGreaterThan(0)
  })
})
