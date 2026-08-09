import { useEffect, useRef, useState } from 'react'
import { jstClockLabel } from '@/utils/format'

// 新規スケジュール取得後の再ボタン活性化までの秒数(原本の正確な値は未取得のためデモ既定値)
const REFRESH_COOLDOWN_SECONDS = 10
const FETCH_MIN_MS = 300
const FETCH_JITTER_MS = 300

type ScheduleRefresh = {
  isRefreshing: boolean
  cooldown: number
  // 予定を取り込んだ時刻(JST の HH:MM)。まだ取り込んでいない間は null
  lastUpdatedLabel: string | null
  refresh: () => void
}

export const useScheduleRefresh = (): ScheduleRefresh => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  // マウント時刻をそのまま初回取得時刻として持つ。静的書き出し(サーバー側)では
  // ビルド時刻を焼き付けないよう null にし、ブラウザで初めて値が入る
  const [lastUpdatedMs, setLastUpdatedMs] = useState<number | null>(() =>
    typeof window === 'undefined' ? null : Date.now()
  )
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
      setLastUpdatedMs(Date.now())
    }, delay)
  }

  return {
    isRefreshing,
    cooldown,
    lastUpdatedLabel: lastUpdatedMs === null ? null : jstClockLabel(lastUpdatedMs),
    refresh,
  }
}
