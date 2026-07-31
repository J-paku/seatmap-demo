import { useEffect, useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'

// 横スクロールヒントの判定。Desktop / Compact 共通で scrollWidth 実測を使う

type ScrollHints = {
  hasOverflow: boolean
  atStart: boolean
  atEnd: boolean
}

// 実 DOM から現在値を読む
const readHints = (el: HTMLElement): ScrollHints => {
  const max = el.scrollWidth - el.clientWidth
  return {
    hasOverflow: max > 1,
    atStart: el.scrollLeft <= 1,
    atEnd: el.scrollLeft >= max - 1,
  }
}

const isSameHints = (a: ScrollHints, b: ScrollHints): boolean =>
  a.hasOverflow === b.hasOverflow && a.atStart === b.atStart && a.atEnd === b.atEnd

// scrollWidth / clientWidth / scrollLeft を実測し、scroll・コンテナリサイズ・列数変化のたびに測り直す
export const useScrollHints = (
  ref: RefObject<HTMLElement | null>,
  cols: number
): ScrollHints => {
  const [hints, setHints] = useState<ScrollHints>({ hasOverflow: false, atStart: true, atEnd: true })

  // 依存配列なし = 毎コミット後に同期再測定。セル幅などの非同期更新でリレンダーした直後の実 DOM を拾う。
  // 変化なしなら前回オブジェクトを返し無限レンダーを防ぐ
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const next = readHints(el)
    setHints((prev) => (isSameHints(prev, next) ? prev : next))
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const next = readHints(el)
      setHints((prev) => (isSameHints(prev, next) ? prev : next))
    }
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
