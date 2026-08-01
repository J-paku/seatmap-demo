import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

// オーバーレイを開いた直後のふるまい(ローディング擬似・クリックロック・スクロール位置戻し)。
// PC / モバイルで分岐しない共通処理

// 350ms は誤タップ防止で操作を受け付けない
const CLICK_LOCK_MS = 350
const LOAD_MIN_MS = 300
const LOAD_JITTER_MS = 300

type OverlaySession = {
  loading: boolean
  clickLocked: boolean
  syncedAt: string
}

export const useOverlaySession = (
  isOpen: boolean,
  bodyRef: RefObject<HTMLElement | null>
): OverlaySession => {
  const [loading, setLoading] = useState(true)
  const [clickLocked, setClickLocked] = useState(true)
  const [syncedAt, setSyncedAt] = useState('')

  useEffect(() => {
    if (!isOpen) return
    // 「開いた」というイベントに対するローディング演出。派生値ではなくライフサイクルそのもの
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setClickLocked(true)
    // 開くたびに本文スクロールを先頭へ戻す
    if (bodyRef.current) bodyRef.current.scrollTop = 0

    const delay = LOAD_MIN_MS + Math.floor(Math.random() * LOAD_JITTER_MS)
    const loadTimer = window.setTimeout(() => {
      setLoading(false)
      const now = new Date()
      setSyncedAt(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
    }, delay)
    const lockTimer = window.setTimeout(() => setClickLocked(false), CLICK_LOCK_MS)
    return () => {
      window.clearTimeout(loadTimer)
      window.clearTimeout(lockTimer)
    }
  }, [isOpen, bodyRef])

  return { loading, clickLocked, syncedAt }
}
