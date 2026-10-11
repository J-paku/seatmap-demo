import { useRef, useState } from 'react'
import { CalendarPopover } from './CalendarPopover'
import { useSelectedDate } from '@/contexts/selected-date-context'
import { jstWeekday } from '@/utils/jst-date'
import type { JstDate } from '@/utils/jst-date'
import styles from './date-navigator.module.css'

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
  const labelColorClass = weekday === 0 ? styles.dateLabelSun : weekday === 6 ? styles.dateLabelSat : ''

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
    <div className={styles.dateNavigator}>
      <div className={styles.dateNavigatorRow}>
        <button type='button' className={styles.dateNavBtn} aria-label='前日' onClick={handlePrev}>
          ‹
        </button>
        <button
          ref={triggerRef}
          type='button'
          className={styles.dateLabelBtn}
          onClick={() => {
            lightHaptic()
            setCalendarOpen((v) => !v)
          }}
        >
          {date.y !== today.y && <span className={styles.dateYearChip}>{date.y}年</span>}
          <span key={`${date.y}-${date.m}-${date.d}`} className={`${styles.dateLabelText} ${labelColorClass}`}>
            {formatLabel(date)}
          </span>
          <span className={styles.dateCalendarIcon} aria-hidden='true'>
            📅
          </span>
        </button>
        <button type='button' className={styles.dateNavBtn} aria-label='翌日' onClick={handleNext}>
          ›
        </button>
      </div>
      {!isToday && (
        <div className={styles.dateTodayReturnRow}>
          <button type='button' className={styles.dateTodayReturnBtn} onClick={handleToday}>
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
