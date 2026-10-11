import { useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

// 500ms の長押し判定だけを持つ。何が起きるかは呼び出し側が決める。
// 通常 click との二重発火は呼び出し側が consumeFired() で消費する。
//
// 元は +FAB 専用(components/AdminAddFab/hooks/use-fab-long-press.ts)だったが、
// 仕様 §05-1 の「管理者がチーム枠・家具を長押しで編集セッションへ入る」も同じ判定を使う。
// 使い手が2箇所を超えたのでルート hooks/ へ引き上げた — 同じ概念に2つ目のしきい値を作らないため
const LONG_PRESS_DURATION = 500
// pointermove の x/y 差分がこれを超えたら長押しを取り消す
const MOVE_THRESHOLD = 10

export type UseLongPressParams = {
  onLongPress: () => void
}

export type UseLongPressResult = {
  // 発火済みなら消費して true を返す。呼び出し側の onClick が通常クリックを握りつぶす判定に使う
  consumeFired: () => boolean
  handlers: {
    onPointerDown: (e: ReactPointerEvent) => void
    onPointerMove: (e: ReactPointerEvent) => void
    onPointerUp: () => void
    onPointerLeave: () => void
    onPointerCancel: () => void
  }
}

export const useLongPress = ({ onLongPress }: UseLongPressParams): UseLongPressResult => {
  const firedRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const startRef = useRef({ x: 0, y: 0 })

  const clearTimer = () => {
    if (timerRef.current === null) return
    window.clearTimeout(timerRef.current)
    timerRef.current = null
  }

  // アンマウント時にタイマーを生かしたままにしない
  useEffect(() => clearTimer, [])

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!e.isPrimary || e.button !== 0) return
    // 次の押下ごとに消費済みへ戻す。onClick 側での消費漏れの保険
    firedRef.current = false
    startRef.current = { x: e.clientX, y: e.clientY }
    clearTimer()
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      firedRef.current = true
      onLongPress()
    }, LONG_PRESS_DURATION)
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    if (timerRef.current === null) return
    const dx = Math.abs(e.clientX - startRef.current.x)
    const dy = Math.abs(e.clientY - startRef.current.y)
    if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) clearTimer()
  }

  // 発火済みフラグの読み取りと消費を1回の呼び出しに閉じる。
  // 呼び出し側に ref を渡すと外から書き換える形になり React Compiler の検査に反する
  const consumeFired = () => {
    if (!firedRef.current) return false
    firedRef.current = false
    return true
  }

  return {
    consumeFired,
    handlers: {
      onPointerDown,
      onPointerMove,
      // pointercancel はネイティブ側にジェスチャーを奪われた時にしか来ないが、
      // これを取らないとタイマーが生き残って後から誤発火する(up が来ないため)
      onPointerUp: clearTimer,
      onPointerLeave: clearTimer,
      onPointerCancel: clearTimer,
    },
  }
}
