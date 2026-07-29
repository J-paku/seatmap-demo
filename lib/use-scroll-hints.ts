import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { COMPACT_VISIBLE_COLS } from './seat-grid'

// 横スクロールヒントの判定。Desktop は実測・Compact は列数判定で、判定方法そのものが分岐点

type DesktopScrollHints = {
  hasOverflow: boolean
  atStart: boolean
  atEnd: boolean
}

// scrollWidth / clientWidth を実測し、scroll・コンテナリサイズ・列数変化のたびに測り直す
export const useDesktopScrollHints = (
  ref: RefObject<HTMLElement | null>,
  cols: number
): DesktopScrollHints => {
  const [hints, setHints] = useState<DesktopScrollHints>({ hasOverflow: false, atStart: true, atEnd: true })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const max = el.scrollWidth - el.clientWidth
      setHints({
        hasOverflow: max > 1,
        atStart: el.scrollLeft <= 1,
        atEnd: el.scrollLeft >= max - 1,
      })
    }
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', measure)
      observer.disconnect()
    }
  }, [ref, cols])

  return hints
}

// Compact は実測せず列数だけで判定する(再測定契機も hasOverflow の変化のみ)
export const useScrollHints = (cols: number): { hasOverflow: boolean } => ({
  hasOverflow: cols > COMPACT_VISIBLE_COLS,
})
