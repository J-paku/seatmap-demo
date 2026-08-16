import { describe, it, expect } from 'vitest'
import type { ScheduleEvent } from '@/types'
import { SELF_EMPLOYEE_ID } from '@/utils/demo-identity'
import {
  jstClockLabel,
  scheduleTimeLabel,
  isScheduleMasked,
  scheduleTitleLabel,
  CATEGORY_LABEL,
  PRESENCE_LABEL,
  PRESENCE_COLOR,
} from '@/utils/format'

describe('jstClockLabel', () => {
  it('formats epoch 0 as 09:00 (JST = UTC+9)', () => {
    expect(jstClockLabel(0)).toBe('09:00')
  })

  it('crosses into the next JST day for a UTC time at/after 15:00', () => {
    expect(jstClockLabel(Date.UTC(2026, 0, 1, 15, 5, 0))).toBe('00:05')
  })

  it('formats the last minute before the JST day rolls over', () => {
    expect(jstClockLabel(Date.UTC(2026, 0, 1, 14, 59, 59, 999))).toBe('23:59')
  })
})

const meeting: ScheduleEvent = {
  id: 'ev1',
  employeeId: 'emp-002',
  title: '定例会議',
  category: 'meeting',
  start: '2026-08-16T09:30:00+09:00',
  end: '2026-08-16T10:00:00+09:00',
  isAllDay: false,
}

describe('scheduleTimeLabel', () => {
  it('shows the start-end range for a timed event', () => {
    expect(scheduleTimeLabel(meeting)).toBe('09:30 - 10:00')
  })

  it('shows 終日 for an all-day event regardless of start/end', () => {
    const allDay: ScheduleEvent = { ...meeting, isAllDay: true }
    expect(scheduleTimeLabel(allDay)).toBe('終日')
  })
})

describe('isScheduleMasked', () => {
  it('is false for a non-private event', () => {
    expect(isScheduleMasked(meeting)).toBe(false)
  })

  it('is true for a private event belonging to someone else', () => {
    const privateEvent: ScheduleEvent = { ...meeting, isPrivate: true }
    expect(isScheduleMasked(privateEvent)).toBe(true)
  })

  it('is false for the self employee’s own private event', () => {
    const ownPrivateEvent: ScheduleEvent = { ...meeting, employeeId: SELF_EMPLOYEE_ID, isPrivate: true }
    expect(isScheduleMasked(ownPrivateEvent)).toBe(false)
  })

  it('is false when isPrivate is explicitly false', () => {
    const explicitlyPublic: ScheduleEvent = { ...meeting, isPrivate: false }
    expect(isScheduleMasked(explicitlyPublic)).toBe(false)
  })
})

describe('scheduleTitleLabel', () => {
  it('returns the title for a visible event', () => {
    expect(scheduleTitleLabel(meeting)).toBe('定例会議')
  })

  it('falls back to 予定あり when the title is an empty string', () => {
    const untitled: ScheduleEvent = { ...meeting, title: '' }
    expect(scheduleTitleLabel(untitled)).toBe('予定あり')
  })

  it('returns 予定あり for a masked event, hiding the real title', () => {
    const privateEvent: ScheduleEvent = { ...meeting, isPrivate: true, title: '秘密の相談' }
    expect(scheduleTitleLabel(privateEvent)).toBe('予定あり')
  })

  it('reveals the real title for the self employee’s own masked-eligible event', () => {
    const ownPrivateEvent: ScheduleEvent = {
      ...meeting,
      employeeId: SELF_EMPLOYEE_ID,
      isPrivate: true,
      title: '通院',
    }
    expect(scheduleTitleLabel(ownPrivateEvent)).toBe('通院')
  })
})

describe('CATEGORY_LABEL', () => {
  it('covers all three schedule categories with their Japanese labels', () => {
    expect(CATEGORY_LABEL).toEqual({
      meeting: '会議',
      out: '外出',
      vacation: '休暇',
    })
  })
})

describe('PRESENCE_LABEL', () => {
  it('covers all four presence statuses with their Japanese labels', () => {
    expect(PRESENCE_LABEL).toEqual({
      present: '在席',
      meeting: '会議',
      out: '外出',
      vacation: '休暇',
    })
  })
})

describe('PRESENCE_COLOR', () => {
  it('points each presence status at its CSS custom property token', () => {
    expect(PRESENCE_COLOR).toEqual({
      present: 'var(--color-status-present)',
      meeting: 'var(--color-status-meeting)',
      out: 'var(--color-status-out)',
      vacation: 'var(--color-status-vacation)',
    })
  })
})
