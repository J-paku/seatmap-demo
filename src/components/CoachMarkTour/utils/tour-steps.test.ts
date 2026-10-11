// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import {
  EDIT_TOUR_BRANCH,
  EDIT_TOUR_STORAGE_KEY,
  FURNITURE_TOUR_STEPS,
  FURNITURE_TOUR_STORAGE_KEY,
  TEAM_TOUR_STEPS,
  TEAM_TOUR_STORAGE_KEY,
} from './tour-steps'
import type { TourStep } from './tour-steps'
import { MAIN_TOUR_STORAGE_KEY } from '@/components/SeatMapView/utils/main-tour-steps'
import { DIRECTORY_TOUR_STORAGE_KEY } from '@/components/EmployeeDirectory/utils/tour-steps'
import { SEAT_LAYOUT_TOUR_STORAGE_KEY } from '@/components/TeamOverlay/utils/tour-steps'

const makeElement = (tag: string, attributes: Record<string, string>): Element => {
  const element = document.createElement(tag)
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value)
  return element
}

// ツアーが当てる先の DOM フック(CLAUDE.md の不変ルール4と、FAB・完了ボタンの属性)を持つ要素
const HOOK_ELEMENTS = {
  team: makeElement('div', { 'data-team-id': 'team-a' }),
  facility: makeElement('div', { 'data-furniture-id': 'room-a', 'data-facility': 'true' }),
  adminFab: makeElement('button', { 'data-coach': 'admin-fab' }),
  finish: makeElement('button', { 'aria-label': '編集を完了' }),
}

// ステップのセレクタがどのフック要素に当たるか。セレクタが無ければ中央カードなので何にも当たらない
const targetsOf = (step: TourStep): string[] => {
  const { selector } = step
  if (selector === undefined) return []
  return Object.entries(HOOK_ELEMENTS)
    .filter(([, element]) => element.matches(selector))
    .map(([name]) => name)
}

// 各ステップを「当てる先・中央へ寄せるか」に写す
const routeOf = (steps: readonly TourStep[]) =>
  steps.map(step => ({ targets: targetsOf(step), centerOnShow: step.centerOnShow === true }))

const optionOf = (key: string) => EDIT_TOUR_BRANCH.options.find(option => option.key === key)

const hasText = (step: TourStep) => step.text.trim().length > 0

describe('EDIT_TOUR_BRANCH', () => {
  it('分岐カードは問いかけと、見出し・説明つきの選択肢を部署と会議室の2つ持つ', () => {
    expect(EDIT_TOUR_BRANCH.title.trim()).not.toBe('')
    expect(EDIT_TOUR_BRANCH.options.map(option => option.key)).toEqual(['layout', 'facility'])
    for (const option of EDIT_TOUR_BRANCH.options) {
      expect(option.label.trim()).not.toBe('')
      expect(option.description.trim()).not.toBe('')
    }
  })

  it('部署の手順は、チーム箱を中央へ寄せて3回照らしてから完了ボタンで終わる', () => {
    const team = { targets: ['team'], centerOnShow: true }
    expect(routeOf(optionOf('layout')?.steps ?? [])).toEqual([
      team,
      team,
      team,
      { targets: ['finish'], centerOnShow: false },
    ])
  })

  it('会議室の手順は、会議室を中央へ寄せて2回照らし、左下の追加ボタンを経て完了ボタンで終わる', () => {
    const room = { targets: ['facility'], centerOnShow: true }
    expect(routeOf(optionOf('facility')?.steps ?? [])).toEqual([
      room,
      room,
      { targets: ['adminFab'], centerOnShow: false },
      { targets: ['finish'], centerOnShow: false },
    ])
  })

  it('どの手順のどのステップにも説明文があり、同じ手順の中で説明が重ならない', () => {
    for (const option of EDIT_TOUR_BRANCH.options) {
      expect(option.steps.every(hasText)).toBe(true)
      expect(new Set(option.steps.map(step => step.text)).size).toBe(option.steps.length)
    }
  })
})

describe.each([
  ['TEAM_TOUR_STEPS', TEAM_TOUR_STEPS],
  ['FURNITURE_TOUR_STEPS', FURNITURE_TOUR_STEPS],
])('%s', (_name, steps) => {
  it('ゴーストは画面中央に出るので、照らす対象を持たない中央カードを3枚続ける', () => {
    expect(steps).toHaveLength(3)
    expect(steps.every(step => step.selector === undefined)).toBe(true)
    expect(steps.every(hasText)).toBe(true)
  })
})

describe('既読キー', () => {
  it('全画面6本のツアーの既読キーは共通の接頭辞を持ち、互いに重ならない', () => {
    const keys = [
      MAIN_TOUR_STORAGE_KEY,
      DIRECTORY_TOUR_STORAGE_KEY,
      SEAT_LAYOUT_TOUR_STORAGE_KEY,
      EDIT_TOUR_STORAGE_KEY,
      TEAM_TOUR_STORAGE_KEY,
      FURNITURE_TOUR_STORAGE_KEY,
    ]
    expect(keys.every(key => /^seatmap_coach_[a-z]+$/.test(key))).toBe(true)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
