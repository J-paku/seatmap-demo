import { useRef, useState } from 'react'
import { CalendarPopover } from './CalendarPopover'
import { useSelectedDate } from '@/contexts/selected-date-context'
import { jstWeekday } from '@/utils/jst-date'
import type { JstDate } from '@/utils/jst-date'

const WEEKDAY_KANJI = ['日', '月', '火', '水', '木', '金', '土']

const formatLabel = (d: JstDate): string => `${d.m}月${d.d}日(${WEEKDAY_KANJI[jstWeekday(d)]})`

const lightHaptic = () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(8)
}

// 04: 日付ラベル・前日/翌日ボタン・カレンダー起動・今日に戻るを束ねるバー
export const DateNavigator = () => {
  const { date, today, isToday, goToPrevDay, goToNextDay, goToToday, setDateImmediate } = useSelectedDate()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const weekday = jstWeekday(date)
  const labelColorClass = weekday === 0 ? 'date-label-sun' : weekday === 6 ? 'date-label-sat' : ''

  const handlePrev = () => {
    lightHaptic()
    goToPrevDay()
  }
  const handleNext = () => {
    lightHaptic()
    goToNextDay()
  }
  const handleToday = () => {
    lightHaptic()
    goToToday()
  }
  const handleCalendarSelect = (next: JstDate) => {
    lightHaptic()
    setDateImmediate(next)
    setCalendarOpen(false)
  }

  return (
    <div className='date-navigator'>
      <div className='date-navigator-row'>
        <button type='button' className='date-nav-btn' aria-label='前日' onClick={handlePrev}>
          ‹
        </button>
        <button
          ref={triggerRef}
          type='button'
          className='date-label-btn'
          onClick={() => {
            lightHaptic()
            setCalendarOpen((v) => !v)
          }}
        >
          {date.y !== today.y && <span className='date-year-chip'>{date.y}年</span>}
          <span key={`${date.y}-${date.m}-${date.d}`} className={`date-label-text ${labelColorClass}`}>
            {formatLabel(date)}
          </span>
          <span className='date-calendar-icon' aria-hidden='true'>
            📅
          </span>
        </button>
        <button type='button' className='date-nav-btn' aria-label='翌日' onClick={handleNext}>
          ›
        </button>
      </div>
      {!isToday && (
        <div className='date-today-return-row'>
          <button type='button' className='date-today-return-btn' onClick={handleToday}>
            今日に戻る
          </button>
        </div>
      )}
      {calendarOpen && (
        <CalendarPopover
          anchorRef={triggerRef}
          selected={date}
          today={today}
          onSelect={handleCalendarSelect}
          onClose={() => setCalendarOpen(false)}
        />
      )}
    </div>
  )
}
