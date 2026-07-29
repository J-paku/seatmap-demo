import { useEffect } from 'react'
import type { RefObject } from 'react'

// スクロール位置戻し・初期フォーカス・フォーカストラップ + Escape

const FOCUSABLE = 'button:not([disabled]),input'

type Options = {
  isVisible: boolean
  isClosing: boolean
  panelRef: RefObject<HTMLElement | null>
  treeRef: RefObject<HTMLElement | null>
  closeBtnRef: RefObject<HTMLButtonElement | null>
  searchInputRef: RefObject<HTMLInputElement | null>
  onClose: () => void
}

export const useDirectoryFocus = ({
  isVisible,
  isClosing,
  panelRef,
  treeRef,
  closeBtnRef,
  searchInputRef,
  onClose,
}: Options): void => {
  // 表示された瞬間にリストのスクロールを先頭へ戻す
  useEffect(() => {
    if (!isVisible) return
    if (treeRef.current) treeRef.current.scrollTop = 0
  }, [isVisible, treeRef])

  // 出現直後にフォーカス(閉じるボタン優先・モバイルは検索欄)
  useEffect(() => {
    if (!isVisible || isClosing) return
    const id = requestAnimationFrame(() => {
      ;(closeBtnRef.current ?? searchInputRef.current)?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [isVisible, isClosing, closeBtnRef, searchInputRef])

  useEffect(() => {
    if (!isVisible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const root = panelRef.current
      if (!root) return
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
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
  }, [isVisible, panelRef, onClose])
}
