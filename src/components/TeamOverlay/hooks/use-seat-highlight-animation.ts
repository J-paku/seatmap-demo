import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { GLOW_MS, GLOW_REDUCED_MS, SCROLL_DELAY_MS } from '../utils/time-seat-highlight'

// 検索ヒット座席への追従。Compact のみが持つ挙動で、Desktop 側には無い
export const useSeatHighlightAnimation = (
  scrollRef: RefObject<HTMLElement | null>,
  highlightSeatId: string | null
): boolean => {
  const [glowing, setGlowing] = useState(false)

  useEffect(() => {
    if (!highlightSeatId) {
      // glow はタイマー駆動の一時状態。ヒット指定を受けた時点から始まる演出であり派生値ではない
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGlowing(false)
      return
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const scrollTimer = window.setTimeout(() => {
      const target = scrollRef.current?.querySelector<HTMLElement>(
        `[data-seat-id="${highlightSeatId}"]`
      )
      target?.scrollIntoView({
        behavior: reduced ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }, SCROLL_DELAY_MS)
    setGlowing(true)
    const glowTimer = window.setTimeout(
      () => setGlowing(false),
      reduced ? GLOW_REDUCED_MS : GLOW_MS
    )
    return () => {
      window.clearTimeout(scrollTimer)
      window.clearTimeout(glowTimer)
    }
  }, [scrollRef, highlightSeatId])

  return glowing
}
