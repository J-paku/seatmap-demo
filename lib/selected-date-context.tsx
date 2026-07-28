import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

// 04-date-navigator: 選択日の全域状態(JST固定・年月日単位で比較)

// JST基準の暦日(時刻を持たない)
export type JstDate = { y: number; m: number; d: number }

// ボタン連打時の確定日デバウンス(仕様: 250ms)
const DEBOUNCE_MS = 250

const JST_PARTS_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// epoch ms → JST暦日
export const jstDateFromMs = (ms: number): JstDate => {
  const parts = JST_PARTS_FORMATTER.formatToParts(new Date(ms))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return { y: get('year'), m: get('month'), d: get('day') }
}

// JST暦日を昼12:00 UTCのタイムスタンプへ写像(加減算専用・表示には使わない)
const jstDateToNoonMs = (date: JstDate): number => Date.UTC(date.y, date.m - 1, date.d, 12, 0, 0)

// JST暦日 → YYYY-MM-DD (ScheduleEvent.start の日付部分比較用)
export const jstDateKey = (date: JstDate): string =>
  `${date.y.toString().padStart(4, '0')}-${date.m.toString().padStart(2, '0')}-${date.d.toString().padStart(2, '0')}`

// ISO8601(+09:00)の start から JST暦日キー(YYYY-MM-DD)を取り出す(TZ変換不要・先頭10文字がJST日付そのもの)
export const jstKeyFromIso = (iso: string): string => iso.slice(0, 10)

// JST暦日を n日ずらす
export const addJstDays = (date: JstDate, n: number): JstDate => jstDateFromMs(jstDateToNoonMs(date) + n * 86400000)

// 2つのJST暦日が同一か
export const isSameJstDate = (a: JstDate, b: JstDate): boolean => a.y === b.y && a.m === b.m && a.d === b.d

// JST暦日の曜日(0=日〜6=土)
export const jstWeekday = (date: JstDate): number => new Date(jstDateToNoonMs(date)).getUTCDay()

type SelectedDateApi = {
  date: JstDate
  debouncedDate: JstDate
  today: JstDate
  isToday: boolean
  isTodaySelected: boolean
  goToPrevDay: () => void
  goToNextDay: () => void
  goToToday: () => void
  // カレンダー・スワイプ確定用: デバウンスを介さず即時反映
  setDateImmediate: (date: JstDate) => void
}

const Ctx = createContext<SelectedDateApi | null>(null)

export const SelectedDateProvider = ({ children }: { children: ReactNode }) => {
  // アプリ起動時点のJST今日をセッション中固定
  const [today] = useState<JstDate>(() => jstDateFromMs(Date.now()))
  const [date, setDate] = useState<JstDate>(today)
  const [debouncedDate, setDebouncedDate] = useState<JstDate>(today)
  const debounceTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (debounceTimer.current !== null) window.clearTimeout(debounceTimer.current)
    },
    []
  )

  const commitDebounced = useCallback((next: JstDate) => {
    if (debounceTimer.current !== null) window.clearTimeout(debounceTimer.current)
    debounceTimer.current = window.setTimeout(() => {
      debounceTimer.current = null
      setDebouncedDate(next)
    }, DEBOUNCE_MS)
  }, [])

  const goToPrevDay = useCallback(() => {
    setDate((prev) => {
      const next = addJstDays(prev, -1)
      commitDebounced(next)
      return next
    })
  }, [commitDebounced])

  const goToNextDay = useCallback(() => {
    setDate((prev) => {
      const next = addJstDays(prev, 1)
      commitDebounced(next)
      return next
    })
  }, [commitDebounced])

  const goToToday = useCallback(() => {
    if (debounceTimer.current !== null) {
      window.clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
    setDate(today)
    setDebouncedDate(today)
  }, [today])

  // カレンダー選択・スワイプ確定: デバウンスを介さず即時確定
  const setDateImmediate = useCallback((next: JstDate) => {
    if (debounceTimer.current !== null) {
      window.clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
    setDate(next)
    setDebouncedDate(next)
  }, [])

  const isToday = isSameJstDate(date, today)
  const isTodaySelected = isSameJstDate(debouncedDate, today)

  const api = useMemo<SelectedDateApi>(
    () => ({
      date,
      debouncedDate,
      today,
      isToday,
      isTodaySelected,
      goToPrevDay,
      goToNextDay,
      goToToday,
      setDateImmediate,
    }),
    [date, debouncedDate, today, isToday, isTodaySelected, goToPrevDay, goToNextDay, goToToday, setDateImmediate]
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export const useSelectedDate = (): SelectedDateApi => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSelectedDate は SelectedDateProvider 内で使用すること')
  return v
}
