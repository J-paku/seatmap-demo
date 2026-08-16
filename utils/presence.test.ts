import { describe, it, expect } from 'vitest'
import { computePresenceMap } from './presence'
import type { ScheduleEvent } from '@/types'

const event = (over: Partial<ScheduleEvent>): ScheduleEvent => ({
  id: 'ev',
  employeeId: 'e1',
  title: '予定',
  category: 'meeting',
  start: '2026-06-15T09:00:00+09:00',
  end: '2026-06-15T10:00:00+09:00',
  isAllDay: false,
  ...over,
})

// テスト内で使う基準時刻(JST 2026-06-15 09:30)
const NOW = Date.parse('2026-06-15T09:30:00+09:00')

describe('computePresenceMap', () => {
  it('終日休暇があれば常にvacation(useNowに関わらず)', () => {
    const schedules = [event({ isAllDay: true, category: 'vacation' })]
    expect(computePresenceMap(schedules, NOW, true).get('e1')).toBe('vacation')
    expect(computePresenceMap(schedules, NOW, false).get('e1')).toBe('vacation')
  })

  it('終日休暇があれば、同時に進行中のmeetingがあってもvacationが優先される', () => {
    const schedules = [
      event({ isAllDay: true, category: 'vacation' }),
      event({ id: 'ev2', category: 'meeting', start: '2026-06-15T09:00:00+09:00', end: '2026-06-15T10:00:00+09:00' }),
    ]
    expect(computePresenceMap(schedules, NOW, true).get('e1')).toBe('vacation')
  })

  it('useNow=falseなら終日休暇が無い限りpresent固定', () => {
    const schedules = [event({ category: 'meeting' })]
    expect(computePresenceMap(schedules, NOW, false).get('e1')).toBe('present')
  })

  it('useNow=trueで進行中イベントが無ければpresent', () => {
    const schedules = [
      event({ start: '2026-06-15T11:00:00+09:00', end: '2026-06-15T12:00:00+09:00' }),
    ]
    expect(computePresenceMap(schedules, NOW, true).get('e1')).toBe('present')
  })

  it('useNow=trueで進行中イベントがあればそのcategoryを返す', () => {
    const schedules = [event({ category: 'out' })]
    expect(computePresenceMap(schedules, NOW, true).get('e1')).toBe('out')
  })

  it('境界: startちょうどのイベントは進行中に含まれる', () => {
    const schedules = [event({ start: '2026-06-15T09:30:00+09:00', end: '2026-06-15T10:00:00+09:00', category: 'out' })]
    expect(computePresenceMap(schedules, NOW, true).get('e1')).toBe('out')
  })

  it('境界: endちょうどのイベントは進行中に含まれない(終了済み扱い)', () => {
    const schedules = [event({ start: '2026-06-15T09:00:00+09:00', end: '2026-06-15T09:30:00+09:00', category: 'out' })]
    expect(computePresenceMap(schedules, NOW, true).get('e1')).toBe('present')
  })

  it('複数の進行中イベントがあればランクが最も高いものを優先する(vacation>out>meeting)', () => {
    const schedules = [
      event({ id: 'm', category: 'meeting' }),
      event({ id: 'o', category: 'out' }),
    ]
    expect(computePresenceMap(schedules, NOW, true).get('e1')).toBe('out')
  })

  it('非終日のvacationイベントが進行中ならvacationになる(最高ランク)', () => {
    const schedules = [
      event({ id: 'm', category: 'meeting' }),
      event({ id: 'v', category: 'vacation', isAllDay: false }),
    ]
    expect(computePresenceMap(schedules, NOW, true).get('e1')).toBe('vacation')
  })

  it('社員ごとにグループ化して個別に判定する', () => {
    const schedules = [
      event({ employeeId: 'e1', category: 'meeting' }),
      event({ employeeId: 'e2', start: '2026-06-15T11:00:00+09:00', end: '2026-06-15T12:00:00+09:00' }),
    ]
    const map = computePresenceMap(schedules, NOW, true)
    expect(map.get('e1')).toBe('meeting')
    expect(map.get('e2')).toBe('present')
  })

  it('予定を1件も持たない社員はMapに登場しない', () => {
    const schedules = [event({ employeeId: 'e1' })]
    const map = computePresenceMap(schedules, NOW, true)
    expect(map.has('e3')).toBe(false)
  })

  it('空配列を渡せば空のMapを返す', () => {
    const map = computePresenceMap([], NOW, true)
    expect(map.size).toBe(0)
  })
})
