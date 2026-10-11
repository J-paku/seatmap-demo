import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

// 慣性スクロールが静止したとみなすまでの猶予
const SCROLL_SETTLE_MS = 140

// document の capture 段で scroll を監視し、慣性が止まるまで true を返し続ける。
// 「流れているリストを止めるためのタップ」で座席詳細が開くのを防ぐのが目的
export const useScrollActivity = (): RefObject<boolean> => {
  const isScrollingRef = useRef(false)

  useEffect(() => {
    let timer = 0
    const onScroll = () => {
      isScrollingRef.current = true
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        isScrollingRef.current = false
      }, SCROLL_SETTLE_MS)
    }
    document.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('scroll', onScroll, true)
      window.clearTimeout(timer)
    }
  }, [])

  return isScrollingRef
}
