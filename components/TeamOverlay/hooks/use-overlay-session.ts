import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useScheduleRefresh } from '@/hooks/use-schedule-refresh'

// オーバーレイを開いた直後のふるまい(ローディング擬似・クリックロック・スクロール位置戻し)と、
// 同期バッジが出すスケジュール取得状態。PC / モバイルで分岐しない共通処理

// 350ms は誤タップ防止で操作を受け付けない
const CLICK_LOCK_MS = 350
const LOAD_MIN_MS = 300
const LOAD_JITTER_MS = 300

type OverlaySession = {
  loading: boolean
  clickLocked: boolean
  // 以下はスケジュール同期バッジ用。時刻・クールタイム・再取得はこのフックで自作せず、
  // アプリ共通の useScheduleRefresh から借りる。ただし同フックの状態は呼び出しごとに独立なので、
  // 社員詳細・施設パネルのそれぞれが持つ取得時刻とは同期しない(アプリ全体で1つではない)
  syncedAtMs: number | null
  syncCooldown: number
  isSyncing: boolean
  retrySync: () => void
}

export const useOverlaySession = (
  isOpen: boolean,
  bodyRef: RefObject<HTMLElement | null>
): OverlaySession => {
  const [loading, setLoading] = useState(true)
  const [clickLocked, setClickLocked] = useState(true)
  const schedule = useScheduleRefresh()

  // 開くたびに取得し直すが、refresh は毎レンダー作り直されるため
  // 依存に入れると開いていない時も effect が回る。最新の関数だけを ref で持つ
  const refreshRef = useRef(schedule.refresh)
  useEffect(() => {
    refreshRef.current = schedule.refresh
  })

  useEffect(() => {
    if (!isOpen) return
    // 「開いた」というイベントに対するローディング演出。派生値ではなくライフサイクルそのもの
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setClickLocked(true)
    // 開くたびに本文スクロールを先頭へ戻す
    if (bodyRef.current) bodyRef.current.scrollTop = 0
    // 開いた時点のスケジュールを取り直す(クールタイム中なら useScheduleRefresh 側が弾く)
    refreshRef.current()

    const delay = LOAD_MIN_MS + Math.floor(Math.random() * LOAD_JITTER_MS)
    const loadTimer = window.setTimeout(() => setLoading(false), delay)
    const lockTimer = window.setTimeout(() => setClickLocked(false), CLICK_LOCK_MS)
    return () => {
      window.clearTimeout(loadTimer)
      window.clearTimeout(lockTimer)
    }
  }, [isOpen, bodyRef])

  return {
    loading,
    clickLocked,
    syncedAtMs: schedule.lastUpdatedMs,
    syncCooldown: schedule.cooldown,
    isSyncing: schedule.isRefreshing,
    retrySync: schedule.refresh,
  }
}
