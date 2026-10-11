import { useEffect, useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'
import { isSameHints, readHints } from '../utils/read-scroll-hints'
import type { ScrollHints } from '../utils/read-scroll-hints'

// 横スクロールヒントの判定。Desktop / Compact 共通で scrollWidth 実測を使う

// scrollWidth / clientWidth / scrollLeft を実測し、scroll・コンテナリサイズ・列数変化のたびに測り直す
export const useScrollHints = (ref: RefObject<HTMLElement | null>, cols: number): ScrollHints => {
  const [hints, setHints] = useState<ScrollHints>({
    hasOverflow: false,
    atStart: true,
    atEnd: true,
  })

  // 依存配列なし = 毎コミット後に同期再測定。セル幅などの非同期更新でリレンダーした直後の実 DOM を拾う。
  // 変化なしなら前回オブジェクトを返すので無限レンダーにはならない([ref] を渡すと初回しか測れなくなる)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const next = readHints(el)
    setHints(prev => (isSameHints(prev, next) ? prev : next))
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const next = readHints(el)
      setHints(prev => (isSameHints(prev, next) ? prev : next))
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
