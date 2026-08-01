import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

// 検索ヒット座席への追従。Compact のみが持つ挙動で、Desktop 側には無い
const GLOW_MS = 2200
const GLOW_REDUCED_MS = 420
// 開いた直後にスクロールしても効かない。理由が2つ重なっている:
//   1. 子の effect は親より先に走るので、親 useOverlaySession の bodyRef.scrollTop = 0 に打ち消される
//   2. パネル自身が拡大アニメーション中で、変形中の祖先の下では smooth スクロールの着地点がずれる
// どちらも「開き終わってから動かす」で解ける。クリックロック 350ms の直後に合わせる
const SCROLL_DELAY_MS = 360

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
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const scrollTimer = window.setTimeout(() => {
      const target = scrollRef.current?.querySelector<HTMLElement>(`[data-seat-id="${highlightSeatId}"]`)
      target?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest', inline: 'center' })
    }, SCROLL_DELAY_MS)
    setGlowing(true)
    const glowTimer = window.setTimeout(() => setGlowing(false), reduced ? GLOW_REDUCED_MS : GLOW_MS)
    return () => {
      window.clearTimeout(scrollTimer)
      window.clearTimeout(glowTimer)
    }
  }, [scrollRef, highlightSeatId])

  return glowing
}
