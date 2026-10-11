import { describe, expect, it } from 'vitest'
import { deterministicDelay } from './compute-schedule-delay'

describe('deterministicDelay', () => {
  it.each([
    { dateKey: '2026-10-12', facilityId: 'fac-01', delay: 261 },
    { dateKey: '2026-10-12', facilityId: 'fac-02', delay: 262 },
    { dateKey: '2026-12-31', facilityId: 'room-a', delay: 431 },
    // ハッシュが負になる組。符号なしへ直してから割るので範囲内に収まる
    { dateKey: '2026-10-13', facilityId: 'fac-01', delay: 496 },
  ])('$dateKey と $facilityId の組からは常に $delay ms', ({ dateKey, facilityId, delay }) => {
    expect(deterministicDelay(dateKey, facilityId)).toBe(delay)
    expect(deterministicDelay(dateKey, facilityId)).toBe(delay)
  })

  it('どの組でも 200ms 以上 500ms 未満に収まる', () => {
    const delays = Array.from({ length: 31 }, (_, day) =>
      ['fac-01', 'fac-02', 'room-a'].map(facilityId =>
        deterministicDelay(`2026-10-${String(day + 1).padStart(2, '0')}`, facilityId)
      )
    ).flat()
    expect(delays.every(delay => delay >= 200 && delay < 500)).toBe(true)
  })
})
