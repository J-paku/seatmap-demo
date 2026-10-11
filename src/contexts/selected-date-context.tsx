import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { addJstDays, isSameJstDate, jstDateFromMs } from '@/utils/jst-date'
import type { JstDate } from '@/utils/jst-date'

// 04-date-navigator: 選択日の全域状態(暦日の計算そのものは utils/jst-date が持つ)

// ボタン連打時の確定日デバウンス(仕様: 250ms)
const DEBOUNCE_MS = 250

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
