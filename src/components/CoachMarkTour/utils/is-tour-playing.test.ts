import { describe, expect, it } from 'vitest'
import { isTourPlaying } from './is-tour-playing'
import type { TourStep } from './tour-steps'

const step: TourStep = { text: '説明' }

describe('isTourPlaying', () => {
  it('分岐カードもステップも立っていなければ再生中ではない', () => {
    expect(isTourPlaying({ isBranching: false, step: null })).toBe(false)
  })

  it('分岐カードだけが立っていれば再生中', () => {
    expect(isTourPlaying({ isBranching: true, step: null })).toBe(true)
  })

  it('ステップだけが立っていれば再生中', () => {
    expect(isTourPlaying({ isBranching: false, step })).toBe(true)
  })

  it('両方が立っていても再生中', () => {
    expect(isTourPlaying({ isBranching: true, step })).toBe(true)
  })
})
