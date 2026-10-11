import { describe, it, expect } from 'vitest'
import { MAIN_TOUR_STEPS, MAIN_TOUR_STORAGE_KEY } from './main-tour-steps'
import {
  EDIT_TOUR_STORAGE_KEY,
  FURNITURE_TOUR_STORAGE_KEY,
  TEAM_TOUR_STORAGE_KEY,
} from '@/components/CoachMarkTour/utils/tour-steps'
import { SEAT_LAYOUT_TOUR_STORAGE_KEY } from '@/components/TeamOverlay/utils/tour-steps'
import { DIRECTORY_TOUR_STORAGE_KEY } from '@/components/EmployeeDirectory/utils/tour-steps'

// data-coach の属性セレクタ(値は引用符なし)から対象名を取り出す
const coachTargetOf = (selector: string | undefined) =>
  /^\[data-coach=([a-z-]+)\]$/.exec(selector ?? '')?.[1]

describe('MAIN_TOUR_STORAGE_KEY', () => {
  it('コーチマーク既読キーの接頭辞を持ち、他のガイドのキーと重ならない', () => {
    expect(MAIN_TOUR_STORAGE_KEY).toMatch(/^seatmap_coach_[a-z]+$/)
    expect([
      DIRECTORY_TOUR_STORAGE_KEY,
      SEAT_LAYOUT_TOUR_STORAGE_KEY,
      EDIT_TOUR_STORAGE_KEY,
      TEAM_TOUR_STORAGE_KEY,
      FURNITURE_TOUR_STORAGE_KEY,
    ]).not.toContain(MAIN_TOUR_STORAGE_KEY)
  })
})

describe('MAIN_TOUR_STEPS', () => {
  it('フロア切り替え → メニュー → ズーム操作 → チーム箱の4ステップを順に案内する', () => {
    const [layoutSwitcher, headerMenu, zoomControls, teamBox] = MAIN_TOUR_STEPS
    expect(MAIN_TOUR_STEPS).toHaveLength(4)
    expect(coachTargetOf(layoutSwitcher.selector)).toBe('layout-switcher')
    expect(coachTargetOf(headerMenu.selector)).toBe('header-menu')
    expect(coachTargetOf(zoomControls.selector)).toBe('zoom-controls')
    // チーム箱は CLAUDE.md が固定を約束している DOM フック
    expect(teamBox.selector).toBe('[data-team-id]')
  })

  it('どのステップも説明文を持つ', () => {
    for (const step of MAIN_TOUR_STEPS) {
      expect(step.text.trim()).not.toBe('')
    }
  })

  it('画面外にありうるチーム箱だけを、表示時に中央へ寄せる', () => {
    expect(MAIN_TOUR_STEPS.map(step => step.centerOnShow === true)).toEqual([
      false,
      false,
      false,
      true,
    ])
  })
})
