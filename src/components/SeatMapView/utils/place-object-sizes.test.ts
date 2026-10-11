import { describe, it, expect } from 'vitest'
import {
  FACILITY_DEFAULT_SIZE,
  FACILITY_MIN_SIZE,
  FURNITURE_MIN_SIZE,
  IDLE_SIZE,
} from './place-object-sizes'
import { GHOST_MIN_SIZE } from '@/utils/layout/rect'
import { DEFAULT_SEAT_HEIGHT, DEFAULT_SEAT_WIDTH } from '@/utils/layout/seat-relayout'

describe('FACILITY_DEFAULT_SIZE', () => {
  it('会議室は200×150で置き始める', () => {
    expect(FACILITY_DEFAULT_SIZE).toEqual({ width: 200, height: 150 })
  })
})

describe('IDLE_SIZE', () => {
  it('配置していない間のゴーストは0×0', () => {
    expect(IDLE_SIZE).toEqual({ width: 0, height: 0 })
  })
})

describe('FACILITY_MIN_SIZE', () => {
  it('会議室は座席1つ分より小さくしない', () => {
    expect(FACILITY_MIN_SIZE).toEqual({ width: DEFAULT_SEAT_WIDTH, height: DEFAULT_SEAT_HEIGHT })
  })
})

describe('FURNITURE_MIN_SIZE', () => {
  it('家具はゴースト共通の最小辺まで縮められる', () => {
    expect(FURNITURE_MIN_SIZE).toEqual({ width: GHOST_MIN_SIZE, height: GHOST_MIN_SIZE })
  })
})
