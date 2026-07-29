import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

// 検索ヒット座席への追従。Compact のみが持つ挙動で、Desktop 側には無い
const GLOW_MS = 2200
const GLOW_REDUCED_MS = 420

export const useSeatHighlightAnimation = (
  scrollRef: RefObject<HTMLElement | null>,
  highlightSeatId: string | null
): boolean => {
  const [glowing, setGlowing] = useState(false)

  useEffect(() => {
    if (!highlightSeatId) {
      setGlowing(false)
      return
    }
    const container = scrollRef.current
    const target = container?.querySelector<HTMLElement>(`[data-seat-id="${highlightSeatId}"]`)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest', inline: 'center' })
    setGlowing(true)
    const timer = window.setTimeout(() => setGlowing(false), reduced ? GLOW_REDUCED_MS : GLOW_MS)
    return () => window.clearTimeout(timer)
  }, [scrollRef, highlightSeatId])

  return glowing
}
