import { describe, it, expect } from 'vitest'
import { flickSpeed } from './measure-flick-speed'

describe('flickSpeed', () => {
  it('窓の中の最初と最後のサンプルから px/ms を求める', () => {
    expect(
      flickSpeed(
        [
          { x: 10, t: 50 },
          { x: 40, t: 80 },
          { x: 70, t: 110 },
        ],
        110
      )
    ).toBe(1)
  })

  it('ちょうど 100ms 前のサンプルは窓に入る', () => {
    expect(
      flickSpeed(
        [
          { x: 0, t: 0 },
          { x: 50, t: 100 },
        ],
        100
      )
    ).toBe(0.5)
  })

  it('100ms より古いサンプルは使わない', () => {
    const samples = [
      { x: 0, t: 0 },
      { x: 100, t: 200 },
      { x: 160, t: 300 },
    ]
    expect(flickSpeed(samples, 300)).toBe(0.6)
  })

  it('逆向きのフリックは負の値', () => {
    expect(
      flickSpeed(
        [
          { x: 80, t: 0 },
          { x: 20, t: 30 },
        ],
        30
      )
    ).toBe(-2)
  })

  it('窓の中のサンプルが2つ未満なら 0', () => {
    expect(flickSpeed([], 100)).toBe(0)
    expect(
      flickSpeed(
        [
          { x: 0, t: 0 },
          { x: 50, t: 200 },
        ],
        200
      )
    ).toBe(0)
  })

  it('同じ時刻の2サンプルは 1ms で割る', () => {
    expect(
      flickSpeed(
        [
          { x: 0, t: 10 },
          { x: 7, t: 10 },
        ],
        10
      )
    ).toBe(7)
  })
})
