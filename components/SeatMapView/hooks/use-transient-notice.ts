import { useCallback, useEffect, useRef, useState } from 'react'

// 座席未設定などの一時通知。トーストとライブリージョンへ同じ文言を流す。
//
// 連続で通知すると前回のタイマーが後から発火して新しい文言を消してしまう。
// 立て続けの配属操作では毎回起きるので、出す前に前のタイマーを畳む

// 通知を出しておく時間
const NOTICE_MS = 2400

export const useTransientNotice = (): { notice: string | null; showNotice: (message: string) => void } => {
  const [notice, setNotice] = useState<string | null>(null)
  const timerRef = useRef(0)

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const showNotice = useCallback((message: string) => {
    window.clearTimeout(timerRef.current)
    setNotice(message)
    timerRef.current = window.setTimeout(() => setNotice(null), NOTICE_MS)
  }, [])

  return { notice, showNotice }
}
