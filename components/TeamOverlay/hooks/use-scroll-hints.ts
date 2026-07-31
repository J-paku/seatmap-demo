import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

// 横スクロールヒントの判定。Desktop / Compact 共通で scrollWidth 実測を使う

type ScrollHints = {
  hasOverflow: boolean
  atStart: boolean
  atEnd: boolean
}

// scrollWidth / clientWidth / scrollLeft を実測し、scroll・コンテナリサイズ・列数変化のたびに測り直す
// extraDep: グリッド内部の幅が非同期に変わるビュー(Compact のセル幅測定など)向けの追加の再測定契機
export const useScrollHints = (
  ref: RefObject<HTMLElement | null>,
  cols: number,
  extraDep?: number
): ScrollHints => {
  const [hints, setHints] = useState<ScrollHints>({ hasOverflow: false, atStart: true, atEnd: true })

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
  }, [ref, cols, extraDep])

  return hints
}
