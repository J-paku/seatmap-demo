import { useEffect, useRef, useState } from 'react'

// 新規スケジュール取得後の再ボタン活性化までの秒数(原本の正確な値は未取得のためデモ既定値)
const REFRESH_COOLDOWN_SECONDS = 10
const FETCH_MIN_MS = 300
const FETCH_JITTER_MS = 300

type ScheduleRefresh = {
  isRefreshing: boolean
  cooldown: number
  refresh: () => void
}

export const useScheduleRefresh = (): ScheduleRefresh => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const timeoutRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    },
    []
  )

  // 秒単位カウントダウン
  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000)
    return () => window.clearInterval(id)
  }, [cooldown])

  const refresh = () => {
    if (isRefreshing || cooldown > 0) return
    setIsRefreshing(true)
    const delay = FETCH_MIN_MS + Math.floor(Math.random() * FETCH_JITTER_MS)
    timeoutRef.current = window.setTimeout(() => {
      setIsRefreshing(false)
      setCooldown(REFRESH_COOLDOWN_SECONDS)
    }, delay)
  }

  return { isRefreshing, cooldown, refresh }
}
