import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { buildMonthGrid, isSameJstDate, jstWeekday } from '@/utils/jst-date'
import type { JstDate } from '@/utils/jst-date'
import styles from './date-navigator.module.css'

type Props = {
  anchorRef: React.RefObject<HTMLElement | null>
  selected: JstDate
  today: JstDate
  onSelect: (date: JstDate) => void
  onClose: () => void
}

// 選択可能範囲: 今年-4年の1/1 〜 今年+4年の12/31
const MIN_YEAR_OFFSET = -4
const MAX_YEAR_OFFSET = 4

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

export const CalendarPopover = ({ anchorRef, selected, today, onSelect, onClose }: Props) => {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [viewYear, setViewYear] = useState(selected.y)
  const [viewMonth, setViewMonth] = useState(selected.m)
  const [mode, setMode] = useState<'day' | 'year'>('day')
  const [placement, setPlacement] = useState<{ top: number; left: number; flipUp: boolean }>({
    top: 0,
    left: 0,
    flipUp: false,
  })

  const minYear = today.y + MIN_YEAR_OFFSET
  const maxYear = today.y + MAX_YEAR_OFFSET

  // アンカー直下(空間不足時は直上)に配置。左右は画面端から8pxクランプ
  useLayoutEffect(() => {
    const anchor = anchorRef.current
    const popover = popoverRef.current
    if (!anchor || !popover) return
    const rect = anchor.getBoundingClientRect()
    const popoverHeight = popover.offsetHeight
    const margin = 8
    const maxWidth = 384
    const width = Math.min(maxWidth, window.innerWidth - margin * 2)
    const center = rect.left + rect.width / 2
    let left = center - width / 2
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin))

    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const flipUp = spaceBelow < popoverHeight + margin && spaceAbove > spaceBelow

    const top = flipUp ? rect.top - popoverHeight - 8 : rect.bottom + 8
    setPlacement({ top, left, flipUp })
  }, [anchorRef, mode, viewYear, viewMonth])

  // トリガー・ポップオーバー外の press で閉じる(オーバーレイなし)
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (popoverRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [anchorRef, onClose])

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth])

  // 選択年を中心に前後4年・9年(3x3)
  const yearGrid = useMemo(() => {
    const years: number[] = []
    for (let i = -4; i <= 4; i++) years.push(viewYear + i)
    return years
  }, [viewYear])

  const goPrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1)
      setViewMonth(12)
    } else {
      setViewMonth((m) => m - 1)
    }
  }
  const goNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1)
      setViewMonth(1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const isInRange = (y: number): boolean => y >= minYear && y <= maxYear

  return (
    <div
      ref={popoverRef}
      className={styles.calendarPopover}
      style={{ top: placement.top, left: placement.left }}
      role='dialog'
      aria-label='日付選択カレンダー'
    >
      <div className={styles.calendarHeader}>
        <button type='button' className={styles.calendarNavBtn} onClick={goPrevMonth} aria-label='前月' disabled={mode === 'year'}>
          ‹
        </button>
        <button type='button' className={styles.calendarHeaderLabel} onClick={() => setMode(mode === 'day' ? 'year' : 'day')}>
          {viewYear}年{viewMonth}月
        </button>
        <button type='button' className={styles.calendarNavBtn} onClick={goNextMonth} aria-label='翌月' disabled={mode === 'year'}>
          ›
        </button>
      </div>

      {mode === 'year' ? (
        <div className={styles.calendarYearGrid}>
          {yearGrid.map((y) => (
            <button
              key={y}
              type='button'
              className={`${styles.calendarYearCell}${y === viewYear ? ` ${styles.calendarYearCellSelected}` : ''}`}
              disabled={!isInRange(y)}
              onClick={() => {
                setViewYear(y)
                setMode('day')
              }}
            >
              {y}年
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className={styles.calendarWeekdayRow}>
            {WEEKDAY_LABELS.map((label, i) => (
              <span
                key={label}
                className={`${styles.calendarWeekday}${i === 0 ? ` ${styles.calendarWeekdaySun}` : i === 6 ? ` ${styles.calendarWeekdaySat}` : ''}`}
              >
                {label}
              </span>
            ))}
          </div>
          <div className={styles.calendarDayGrid}>
            {grid.map((cell) => {
              const weekday = jstWeekday(cell)
              const inMonth = cell.m === viewMonth
              const isSelected = isSameJstDate(cell, selected)
              const isToday = isSameJstDate(cell, today)
              const disabled = cell.y < minYear || cell.y > maxYear
              const classes = [
                styles.calendarDayCell,
                !inMonth ? styles.calendarDayOutside : '',
                weekday === 0 ? styles.calendarDaySun : '',
                weekday === 6 ? styles.calendarDaySat : '',
                isSelected ? styles.calendarDaySelected : '',
                isToday ? styles.calendarDayToday : '',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <button
                  key={`${cell.y}-${cell.m}-${cell.d}`}
                  type='button'
                  className={classes}
                  disabled={disabled}
                  onClick={() => onSelect(cell)}
                >
                  {cell.d}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
