import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { buildMonthGrid, isSameJstDate, jstWeekday } from '@/utils/jst-date'
import type { JstDate } from '@/utils/jst-date'

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
      className='calendar-popover'
      style={{ top: placement.top, left: placement.left }}
      role='dialog'
      aria-label='日付選択カレンダー'
    >
      <div className='calendar-header'>
        <button type='button' className='calendar-nav-btn' onClick={goPrevMonth} aria-label='前月' disabled={mode === 'year'}>
          ‹
        </button>
        <button type='button' className='calendar-header-label' onClick={() => setMode(mode === 'day' ? 'year' : 'day')}>
          {viewYear}年{viewMonth}月
        </button>
        <button type='button' className='calendar-nav-btn' onClick={goNextMonth} aria-label='翌月' disabled={mode === 'year'}>
          ›
        </button>
      </div>

      {mode === 'year' ? (
        <div className='calendar-year-grid'>
          {yearGrid.map((y) => (
            <button
              key={y}
              type='button'
              className={`calendar-year-cell${y === viewYear ? ' calendar-year-cell-selected' : ''}`}
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
          <div className='calendar-weekday-row'>
            {WEEKDAY_LABELS.map((label, i) => (
              <span
                key={label}
                className={`calendar-weekday${i === 0 ? ' calendar-weekday-sun' : i === 6 ? ' calendar-weekday-sat' : ''}`}
              >
                {label}
              </span>
            ))}
          </div>
          <div className='calendar-day-grid'>
            {grid.map((cell) => {
              const weekday = jstWeekday(cell)
              const inMonth = cell.m === viewMonth
              const isSelected = isSameJstDate(cell, selected)
              const isToday = isSameJstDate(cell, today)
              const disabled = cell.y < minYear || cell.y > maxYear
              const classes = [
                'calendar-day-cell',
                !inMonth ? 'calendar-day-outside' : '',
                weekday === 0 ? 'calendar-day-sun' : '',
                weekday === 6 ? 'calendar-day-sat' : '',
                isSelected ? 'calendar-day-selected' : '',
                isToday ? 'calendar-day-today' : '',
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
