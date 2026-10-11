import { useEffect } from 'react'
import type { RefObject } from 'react'
import { FOCUSABLE } from '@/utils/trap-focus'

// Tab 循環フォーカストラップ(3箇所の複製を統合)。ESC 処理や初期フォーカスは各呼び出し側の責務
export const useFocusTrap = (active: boolean, panelRef: RefObject<HTMLElement | null>): void => {
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        el => el.offsetParent !== null
      )
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const activeEl = document.activeElement as HTMLElement | null
      if (e.shiftKey && activeEl === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active, panelRef])
}
