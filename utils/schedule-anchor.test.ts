import { describe, it, expect } from 'vitest'
import { anchorSchedulesToDate } from './schedule-anchor'
import type { ScheduleEvent } from '@/types'

const baseEvent: ScheduleEvent = {
  id: 'ev-1',
  employeeId: 'emp-1',
  title: '定例会議',
  category: 'meeting',
  start: '2024-01-01T09:00:00+09:00',
  end: '2024-01-01T10:00:00+09:00',
  isAllDay: false,
}

describe('anchorSchedulesToDate', () => {
  it('start/endの日付部分だけをnowMsのJST日付へ差し替える', () => {
    // UTC 3:00 = JST 12:00 (同日) → dateKey は 2026-06-15
    const nowMs = Date.UTC(2026, 5, 15, 3, 0, 0)
    const [result] = anchorSchedulesToDate([baseEvent], nowMs)
    expect(result.start).toBe('2026-06-15T09:00:00+09:00')
    expect(result.end).toBe('2026-06-15T10:00:00+09:00')
  })

  it('日付以外のフィールドは変更しない', () => {
    const nowMs = Date.UTC(2026, 5, 15, 3, 0, 0)
    const [result] = anchorSchedulesToDate([baseEvent], nowMs)
    expect(result.id).toBe(baseEvent.id)
    expect(result.employeeId).toBe(baseEvent.employeeId)
    expect(result.title).toBe(baseEvent.title)
    expect(result.category).toBe(baseEvent.category)
    expect(result.isAllDay).toBe(baseEvent.isAllDay)
  })

  it('元の配列・元のイベントを変更しない(非破壊)', () => {
    const events = [{ ...baseEvent }]
    const nowMs = Date.UTC(2026, 5, 15, 3, 0, 0)
    anchorSchedulesToDate(events, nowMs)
    expect(events[0].start).toBe('2024-01-01T09:00:00+09:00')
    expect(events[0].end).toBe('2024-01-01T10:00:00+09:00')
  })

  it('複数イベントすべてに同じ日付キーを適用する', () => {
    const second: ScheduleEvent = {
      ...baseEvent,
      id: 'ev-2',
      start: '2024-03-03T13:00:00+09:00',
      end: '2024-03-03T14:00:00+09:00',
    }
    const nowMs = Date.UTC(2026, 5, 15, 3, 0, 0)
    const result = anchorSchedulesToDate([baseEvent, second], nowMs)
    expect(result[0].start).toBe('2026-06-15T09:00:00+09:00')
    expect(result[1].start).toBe('2026-06-15T13:00:00+09:00')
  })

  it('JST日跨ぎ境界のnowMsで日付が繰り上がる', () => {
    // UTC 15:00:00 = JST 翌日00:00:00 → dateKeyは2026-01-02
    const nowMs = Date.UTC(2026, 0, 1, 15, 0, 0)
    const [result] = anchorSchedulesToDate([baseEvent], nowMs)
    expect(result.start).toBe('2026-01-02T09:00:00+09:00')
  })

  it('空配列を渡すと空配列を返す', () => {
    const nowMs = Date.UTC(2026, 5, 15, 3, 0, 0)
    expect(anchorSchedulesToDate([], nowMs)).toEqual([])
  })
})
