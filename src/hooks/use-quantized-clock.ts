import { useEffect, useState } from 'react'

// 1分量子化した現在時刻(ms)。60秒 interval + visibilitychange/focus/online で即再同期
// 同じ分内の更新はスキップして再レンダーを抑制する。enabled=false のとき停止
export const useQuantizedClock = (enabled: boolean): number => {
  const [minuteMs, setMinuteMs] = useState(() => {
    const now = Date.now()
    return now - (now % 60000)
  })

  useEffect(() => {
    if (!enabled) return
    const sync = () => {
      const now = Date.now()
      const q = now - (now % 60000)
      setMinuteMs((prev) => (prev === q ? prev : q))
    }
    sync()
    const id = window.setInterval(sync, 60000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', sync)
    window.addEventListener('online', sync)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', sync)
      window.removeEventListener('online', sync)
    }
  }, [enabled])

  return minuteMs
}
