import { useEffect } from 'react'
import type { RefObject } from 'react'

// 暗幕の上で起きたスクロールを背面へ伝えない。React の合成イベントは touchmove/wheel を
// passive 登録するため preventDefault が無視される。ここだけネイティブで passive:false 登録する。
// 止めるのは暗幕自身が対象のときだけ — パネル側へ広げるとシート内リストのスクロールまで死ぬ
export const useBackdropTouchGuard = (backdropRef: RefObject<HTMLElement | null>, active: boolean): void => {
  useEffect(() => {
    if (!active) return
    const el = backdropRef.current
    if (!el) return
    const block = (e: Event) => {
      if (e.target === e.currentTarget) e.preventDefault()
    }
    el.addEventListener('touchmove', block, { passive: false })
    el.addEventListener('wheel', block, { passive: false })
    return () => {
      el.removeEventListener('touchmove', block)
      el.removeEventListener('wheel', block)
    }
  }, [backdropRef, active])
}
