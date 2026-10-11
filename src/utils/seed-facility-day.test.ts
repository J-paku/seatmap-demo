import { describe, expect, it } from 'vitest'
import { hashStringToInt } from './hash-string'
import { facilityDaySeed } from './seed-facility-day'

describe('facilityDaySeed', () => {
  it('日付と会議室idを # でつないだ文字列のハッシュを種にする', () => {
    expect(facilityDaySeed('2026-10-12', 'fac-01')).toBe(hashStringToInt('2026-10-12#fac-01'))
  })

  it('同じ組からは何度でも同じ種', () => {
    expect(facilityDaySeed('2026-12-31', 'room-a')).toBe(facilityDaySeed('2026-12-31', 'room-a'))
  })

  it('日付か会議室が違えば種も違う', () => {
    const seed = facilityDaySeed('2026-10-12', 'fac-01')
    expect(facilityDaySeed('2026-10-13', 'fac-01')).not.toBe(seed)
    expect(facilityDaySeed('2026-10-12', 'fac-02')).not.toBe(seed)
  })
})
