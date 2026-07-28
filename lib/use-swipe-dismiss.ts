import { useEffect, useRef } from 'react'
import type { MouseEvent as ReactMouseEvent, RefObject } from 'react'

// スワイプ閉じ判定のしきい値(実測: SheetShellから移植)
const SLOP = 10
const CLOSE_RATIO = 0.28
const FLICK_SPEED = 0.7 // px/ms

type UseSwipeDismissOptions = {
  onClose: () => void
  enabled?: boolean
  scrollGateRef?: RefObject<HTMLElement | null>
}

type SwipeDismissBind = {
  onClickCapture: (e: ReactMouseEvent<HTMLDivElement>) => void
}

type UseSwipeDismissResult = {
  sheetRef: RefObject<HTMLDivElement | null>
  bind: SwipeDismissBind
}

// Pointer Eventはtouch-actionの判定でブラウザにスクロールを先取りされpointercancelが飛ぶため、
// { passive: false }のネイティブtouchイベント + preventDefaultで確実にジェスチャーを主張する
export const useSwipeDismiss = ({ onClose, enabled = true, scrollGateRef }: UseSwipeDismissOptions): UseSwipeDismissResult => {
  const sheetRef = useRef<HTMLDivElement>(null)

  const drag = useRef({
    active: false,
    committed: false,
    abandoned: false,
    fromHandle: false,
    startX: 0,
    startY: 0,
    samples: [] as Array<{ y: number; t: number }>,
    suppressClick: false,
  })

  // onCloseの最新参照をrefで保持し、リスナー登録エフェクトの依存を enabled のみに保つ
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const setSheetTransform = (y: number | null, transition: boolean) => {
    const el = sheetRef.current
    if (!el) return
    el.style.transition = transition ? 'transform 0.2s ease-out' : 'none'
    el.style.transform = y === null ? '' : `translateY(${y}px)`
  }

  useEffect(() => {
    if (!enabled) return
    const el = sheetRef.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      const d = drag.current
      if (e.touches.length > 1) {
        // 二本指目を検知したらジェスチャーごと無効化
        if (d.committed) setSheetTransform(null, true)
        d.active = false
        d.committed = false
        return
      }
      const touch = e.touches[0]
      const target = e.target as HTMLElement
      d.active = true
      d.committed = false
      d.abandoned = false
      d.fromHandle = target.dataset.handle === 'true'
      d.startX = touch.clientX
      d.startY = touch.clientY
      d.samples = [{ y: touch.clientY, t: e.timeStamp }]
    }

    const onTouchMove = (e: TouchEvent) => {
      const d = drag.current
      if (!d.active) return
      if (e.touches.length > 1) {
        if (d.committed) setSheetTransform(null, true)
        d.active = false
        d.committed = false
        d.abandoned = true
        return
      }

      const touch = e.touches[0]
      const dx = touch.clientX - d.startX
      const dy = touch.clientY - d.startY
      d.samples.push({ y: touch.clientY, t: e.timeStamp })
      if (d.samples.length > 12) d.samples.shift()

      if (d.committed) {
        e.preventDefault()
        setSheetTransform(Math.max(0, dy - SLOP), false)
        return
      }
      if (d.abandoned) return

      // 上方優勢は放棄(以降このジェスチャーではコミットしない)
      if (dy < -SLOP) {
        d.abandoned = true
        return
      }
      // 水平優勢は放棄。以降のクリックは抑止
      if (Math.abs(dx) > SLOP && Math.abs(dx) > dy) {
        d.abandoned = true
        d.suppressClick = true
        return
      }

      // 決定条件はスクロールコンテナが上方向へまだスクロール可能か
      // (ハンドル起点/ゲート未指定なら無条件で許可、可能ならブラウザのスクロールに委ねる)
      const gateEl = scrollGateRef?.current
      const scrollAtTop = d.fromHandle || !gateEl || gateEl.scrollTop <= 0
      if (!(dy > 0 && scrollAtTop)) return

      // 閾値到達前の最初のmoveから呼ぶ(ここで止めないとブラウザに先取りされる)
      e.preventDefault()

      if (dy > SLOP && dy > Math.abs(dx)) {
        d.committed = true
        setSheetTransform(Math.max(0, dy - SLOP), false)
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      const d = drag.current
      if (!d.active) return
      d.active = false
      if (d.suppressClick) {
        window.setTimeout(() => {
          d.suppressClick = false
        }, 0)
      }
      if (!d.committed) return
      d.committed = false

      const touch = e.changedTouches[0]
      const dy = touch.clientY - d.startY
      const offset = Math.max(0, dy - SLOP)
      const height = sheetRef.current?.offsetHeight ?? 1

      // 直近100msの下方速度からフリック判定
      const now = e.timeStamp
      const recent = d.samples.filter((s) => now - s.t <= 100)
      let flick = 0
      if (recent.length >= 2) {
        const a = recent[0]
        const b = recent[recent.length - 1]
        flick = (b.y - a.y) / Math.max(1, b.t - a.t)
      }

      if (offset > height * CLOSE_RATIO || flick > FLICK_SPEED) {
        onCloseRef.current()
      } else {
        setSheetTransform(null, true)
      }
    }

    const onTouchCancel = () => {
      const d = drag.current
      d.active = false
      d.committed = false
      d.abandoned = true
      setSheetTransform(null, true)
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: false })
    el.addEventListener('touchcancel', onTouchCancel, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchCancel)
    }
  }, [enabled, scrollGateRef])

  const onClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (drag.current.suppressClick) {
      e.stopPropagation()
      e.preventDefault()
    }
  }

  return {
    sheetRef,
    bind: { onClickCapture },
  }
}
