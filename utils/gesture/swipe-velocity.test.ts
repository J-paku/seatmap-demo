import { describe, it, expect } from 'vitest'
import { pushVelocitySample, computeFlickVelocity, type VelocitySample } from './swipe-velocity'

describe('pushVelocitySample', () => {
  it('appends a sample to an empty array', () => {
    const samples: VelocitySample[] = []
    pushVelocitySample(samples, { t: 0, y: 10 })
    expect(samples).toEqual([{ t: 0, y: 10 }])
  })

  it('keeps samples within the 100ms window', () => {
    const samples: VelocitySample[] = [{ t: 0, y: 0 }]
    pushVelocitySample(samples, { t: 100, y: 5 })
    expect(samples).toEqual([
      { t: 0, y: 0 },
      { t: 100, y: 5 },
    ])
  })

  it('drops the oldest sample once the window is exceeded (boundary at >100ms, not >=)', () => {
    const samples: VelocitySample[] = [{ t: 0, y: 0 }]
    pushVelocitySample(samples, { t: 101, y: 5 })
    expect(samples).toEqual([{ t: 101, y: 5 }])
  })

  it('drops multiple stale samples in one push (while loop, not a single if)', () => {
    const samples: VelocitySample[] = [
      { t: 0, y: 0 },
      { t: 10, y: 1 },
      { t: 20, y: 2 },
    ]
    pushVelocitySample(samples, { t: 130, y: 9 })
    // t=0 and t=10 are both more than 100ms behind the new sample (t=130); t=20 is exactly 110 behind, also stale
    expect(samples).toEqual([{ t: 130, y: 9 }])
  })

  it('retains a sample that is still within the window after trimming', () => {
    const samples: VelocitySample[] = [
      { t: 0, y: 0 },
      { t: 50, y: 3 },
    ]
    pushVelocitySample(samples, { t: 140, y: 9 })
    // t=0 is 140 behind (stale, dropped); t=50 is 90 behind (kept)
    expect(samples).toEqual([
      { t: 50, y: 3 },
      { t: 140, y: 9 },
    ])
  })
})

describe('computeFlickVelocity', () => {
  it('returns 0 when there are no samples', () => {
    expect(computeFlickVelocity([])).toBe(0)
  })

  it('returns 0 when there is only a single sample', () => {
    expect(computeFlickVelocity([{ t: 0, y: 0 }])).toBe(0)
  })

  it('returns 0 when elapsed time between first and last sample is zero', () => {
    expect(
      computeFlickVelocity([
        { t: 50, y: 0 },
        { t: 50, y: 20 },
      ])
    ).toBe(0)
  })

  it('returns 0 when elapsed time is negative (out-of-order samples)', () => {
    expect(
      computeFlickVelocity([
        { t: 50, y: 0 },
        { t: 10, y: 20 },
      ])
    ).toBe(0)
  })

  it('computes downward velocity in px/ms from first and last samples only', () => {
    const velocity = computeFlickVelocity([
      { t: 0, y: 0 },
      { t: 25, y: 10 },
      { t: 50, y: 100 },
    ])
    // Only first (t:0,y:0) and last (t:50,y:100) are used, middle sample is ignored
    expect(velocity).toBe(2)
  })

  it('computes negative velocity for upward movement', () => {
    const velocity = computeFlickVelocity([
      { t: 0, y: 100 },
      { t: 50, y: 0 },
    ])
    expect(velocity).toBe(-2)
  })
})
