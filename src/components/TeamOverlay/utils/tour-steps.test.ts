import { describe, expect, it } from 'vitest'
import { SEAT_LAYOUT_TOUR_STEPS, SEAT_LAYOUT_TOUR_STORAGE_KEY } from './tour-steps'
import {
  EDIT_TOUR_STORAGE_KEY,
  FURNITURE_TOUR_STORAGE_KEY,
  TEAM_TOUR_STORAGE_KEY,
} from '@/components/CoachMarkTour/utils/tour-steps'
import { DIRECTORY_TOUR_STORAGE_KEY } from '@/components/EmployeeDirectory/utils/tour-steps'
import { MAIN_TOUR_STORAGE_KEY } from '@/components/SeatMapView/utils/main-tour-steps'

describe('SEAT_LAYOUT_TOUR_STORAGE_KEY', () => {
  it('コーチマーク既読キーの共通接頭辞 seatmap_coach_ を持つ', () => {
    expect(SEAT_LAYOUT_TOUR_STORAGE_KEY).toMatch(/^seatmap_coach_\w+$/)
  })

  it('ほかの導線の既読キーと重ならない', () => {
    const otherKeys = [
      MAIN_TOUR_STORAGE_KEY,
      DIRECTORY_TOUR_STORAGE_KEY,
      EDIT_TOUR_STORAGE_KEY,
      TEAM_TOUR_STORAGE_KEY,
      FURNITURE_TOUR_STORAGE_KEY,
    ]
    expect(otherKeys).not.toContain(SEAT_LAYOUT_TOUR_STORAGE_KEY)
  })
})

describe('SEAT_LAYOUT_TOUR_STEPS', () => {
  it('分岐なしの直列 2 ステップ', () => {
    expect(SEAT_LAYOUT_TOUR_STEPS).toHaveLength(2)
  })

  it('どのステップも data 属性で対象を指し、文言を持ち、画面中央へ寄せない', () => {
    for (const step of SEAT_LAYOUT_TOUR_STEPS) {
      expect(step.selector).toMatch(/^\[data-/)
      expect(step.text.length).toBeGreaterThan(0)
      expect(step.centerOnShow).toBeUndefined()
    }
  })

  it('2 つのステップは別々の要素を指す', () => {
    const [first, second] = SEAT_LAYOUT_TOUR_STEPS
    expect(first.selector).not.toBe(second.selector)
  })
})
