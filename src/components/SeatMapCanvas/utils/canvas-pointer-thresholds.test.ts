import { describe, it, expect } from 'vitest'
import {
  DOUBLE_TAP_DISTANCE,
  DOUBLE_TAP_MS,
  INERTIA_MIN_SPEED,
  TAP_DISTANCE_THRESHOLD,
  VELOCITY_SAMPLES,
} from './canvas-pointer-thresholds'

describe('キャンバスの1本指の閾値', () => {
  it('タップ距離の閾値は仕様の 8px', () => {
    expect(TAP_DISTANCE_THRESHOLD).toBe(8)
  })

  it('ダブルタップの2打目はタップ1回分の揺れより広い範囲で受ける', () => {
    expect(DOUBLE_TAP_DISTANCE).toBeGreaterThan(TAP_DISTANCE_THRESHOLD)
  })

  it('ダブルタップの受付時間は正の値', () => {
    expect(DOUBLE_TAP_MS).toBeGreaterThan(0)
  })

  it('慣性を始める速度は正の値(止まったまま離した指で慣性を出さない)', () => {
    expect(INERTIA_MIN_SPEED).toBeGreaterThan(0)
  })

  it('初速に使うフレーム数は、フックが残す直近6件に収まる正の整数', () => {
    expect(Number.isInteger(VELOCITY_SAMPLES)).toBe(true)
    expect(VELOCITY_SAMPLES).toBeGreaterThan(0)
    expect(VELOCITY_SAMPLES).toBeLessThanOrEqual(6)
  })
})
