import { useEffect, useRef } from 'react'
import type { MouseEvent as ReactMouseEvent, RefObject } from 'react'
import { useRemountRef } from './use-remount-ref'
import type { RemountRef } from './use-remount-ref'
import { SWIPE_SLOP, downwardFlick, shouldDismiss, swipeOffset } from '@/utils/swipe-threshold'
import type { SwipeSample } from '@/utils/swipe-threshold'

// Pointer Event は touch-action の判定でブラウザにスクロールを先取りされ pointercancel が飛ぶため、
// { passive: false } のネイティブ touch イベント + preventDefault で確実にジェスチャーを主張する

// touch から閉じた直後に飛んでくる合成 click を1回だけ捨てる(二重クローズ防止)。
// シートが外れると click は別の要素へリターゲットされるため document の capture 段で受ける
const swallowNextClick = () => {
  const swallow = (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    cleanup()
  }
  const cleanup = () => {
    document.removeEventListener('click', swallow, true)
    window.clearTimeout(timer)
  }
  const timer = window.setTimeout(cleanup, 350)
  document.addEventListener('click', swallow, true)
}

type UseSwipeDismissOptions = {
  onClose: () => void
  enabled?: boolean
  scrollGateRef?: RefObject<HTMLElement | null>
}

type UseSwipeDismissResult = {
  sheetRef: RemountRef<HTMLDivElement>
  bind: { onClickCapture: (e: ReactMouseEvent<HTMLDivElement>) => void }
}

export const useSwipeDismiss = ({
  onClose,
  enabled = true,
  scrollGateRef,
}: UseSwipeDismissOptions): UseSwipeDismissResult => {
  const { ref: sheetRef, mountTick } = useRemountRef<HTMLDivElement>()

  const drag = useRef({
    active: false,
    committed: false,
    abandoned: false,
    fromHandle: false,
    startX: 0,
    startY: 0,
    startTime: 0,
    samples: [] as SwipeSample[],
    suppressClick: false,
  })

  // onClose の最新参照を ref で保持し、リスナー登録エフェクトの依存を増やさない
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!enabled) return
    const el = sheetRef.current
    if (!el) return

    const setTransform = (y: number | null, transition: boolean) => {
      el.style.transition = transition ? 'transform 0.2s ease-out' : 'none'
      el.style.transform = y === null ? '' : `translateY(${y}px)`
    }

    // 二本指目を検知したらジェスチャーごと無効化
    const abortMultiTouch = () => {
      const d = drag.current
      if (d.committed) setTransform(null, true)
      d.active = false
      d.committed = false
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        abortMultiTouch()
        return
      }
      const touch = e.touches[0]
      drag.current = {
        ...drag.current,
        active: true,
        committed: false,
        abandoned: false,
        fromHandle: (e.target as HTMLElement).dataset.handle === 'true',
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: e.timeStamp,
        samples: [{ y: touch.clientY, t: e.timeStamp }],
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      const d = drag.current
      if (!d.active) return
      if (e.touches.length > 1) {
        abortMultiTouch()
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
        setTransform(swipeOffset(dy), false)
        return
      }
      if (d.abandoned) return

      // 上方優勢は放棄(以降このジェスチャーではコミットしない)
      if (dy < -SWIPE_SLOP) {
        d.abandoned = true
        return
      }
      // 水平優勢は放棄。以降のクリックは抑止
      if (Math.abs(dx) > SWIPE_SLOP && Math.abs(dx) > dy) {
        d.abandoned = true
        d.suppressClick = true
        return
      }

      // 決定条件はスクロールコンテナが上方向へまだスクロール可能か
      // (ハンドル起点/ゲート未指定なら無条件で許可、可能ならブラウザのスクロールに委ねる)
      const gateEl = scrollGateRef?.current
      if (!(dy > 0 && (d.fromHandle || !gateEl || gateEl.scrollTop <= 0))) return

      // 閾値到達前の最初の move から呼ぶ(ここで止めないとブラウザに先取りされる)
      e.preventDefault()

      if (dy > SWIPE_SLOP && dy > Math.abs(dx)) {
        d.committed = true
        setTransform(swipeOffset(dy), false)
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      const d = drag.current
      if (!d.active) return
      d.active = false

      // ハンドルは閉じるための持ち手なので、そこから始めて離したら距離を問わず閉じる。
      // 指で少し引き下げるとスワイプが確定し、閾値に届かず戻る一方でブラウザが click を握り潰すため、
      // button の onClick だけに頼るとハンドルが反応しないように見える。
      // 上/横へ逃げた(abandoned)ときだけは取り消しとして扱う
      if (d.fromHandle && !d.abandoned) {
        d.committed = false
        setTransform(null, false)
        swallowNextClick()
        onCloseRef.current()
        return
      }

      if (d.suppressClick) {
        window.setTimeout(() => {
          d.suppressClick = false
        }, 0)
      }
      if (!d.committed) return
      d.committed = false

      const offset = swipeOffset(e.changedTouches[0].clientY - d.startY)
      const flick = downwardFlick(d.samples, e.timeStamp)
      if (shouldDismiss(offset, el.offsetHeight || 1, flick)) {
        swallowNextClick()
        onCloseRef.current()
      }
      // 追従分は閉じる判定でも必ず戻す。onCloseは呼び出し側の都合で閉じないことがあり
      // (TeamOverlayは編集中の閉じるを拒否する)、アンマウント任せにするとズレたまま残って
      // 中身がビューポート外へ出る。実際に閉じた場合は同じフレームで要素ごと消えるため見た目に出ない
      setTransform(null, true)
    }

    const onTouchCancel = () => {
      const d = drag.current
      d.active = false
      d.committed = false
      d.abandoned = true
      setTransform(null, true)
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
    // mountTick は要素の着脱時に増分され、後からマウントされた要素にもリスナーを付け直すトリガーになる
  }, [enabled, scrollGateRef, mountTick, sheetRef])

  return {
    sheetRef,
    bind: {
      onClickCapture: (e: ReactMouseEvent<HTMLDivElement>) => {
        if (drag.current.suppressClick) {
          e.stopPropagation()
          e.preventDefault()
        }
      },
    },
  }
}
