import { describe, it, expect } from 'vitest'
import { DIRECTORY_TOUR_STEPS, DIRECTORY_TOUR_STORAGE_KEY } from './tour-steps'
import {
  EDIT_TOUR_STORAGE_KEY,
  FURNITURE_TOUR_STORAGE_KEY,
  TEAM_TOUR_STORAGE_KEY,
} from '@/components/CoachMarkTour/utils/tour-steps'
import { SEAT_LAYOUT_TOUR_STORAGE_KEY } from '@/components/TeamOverlay/utils/tour-steps'
import { MAIN_TOUR_STORAGE_KEY } from '@/components/SeatMapView/utils/main-tour-steps'

// data-coach の属性セレクタ(値は二重引用符 \x22 で囲む)から対象名を取り出す
const coachTargetOf = (selector: string | undefined) =>
  /^\[data-coach=\x22([a-z-]+)\x22\]$/.exec(selector ?? '')?.[1]

describe('DIRECTORY_TOUR_STORAGE_KEY', () => {
  it('コーチマーク既読キーの接頭辞を持ち、他のガイドのキーと重ならない', () => {
    expect(DIRECTORY_TOUR_STORAGE_KEY).toMatch(/^seatmap_coach_[a-z]+$/)
    expect([
      MAIN_TOUR_STORAGE_KEY,
      SEAT_LAYOUT_TOUR_STORAGE_KEY,
      EDIT_TOUR_STORAGE_KEY,
      TEAM_TOUR_STORAGE_KEY,
      FURNITURE_TOUR_STORAGE_KEY,
    ]).not.toContain(DIRECTORY_TOUR_STORAGE_KEY)
  })
})

describe('DIRECTORY_TOUR_STEPS', () => {
  it('検索欄 → 部署ツリー → フッターの順に、サイドバーの data-coach フックを指す', () => {
    expect(DIRECTORY_TOUR_STEPS.map(step => coachTargetOf(step.selector))).toEqual([
      'directory-search',
      'directory-tree',
      'directory-footer',
    ])
  })

  it('どのステップも説明文を持つ', () => {
    for (const step of DIRECTORY_TOUR_STEPS) {
      expect(step.text.trim()).not.toBe('')
    }
  })

  it('対象はサイドバー内の固定要素なので、中央へ寄せる指定を持たない', () => {
    expect(DIRECTORY_TOUR_STEPS.some(step => step.centerOnShow)).toBe(false)
  })
})
