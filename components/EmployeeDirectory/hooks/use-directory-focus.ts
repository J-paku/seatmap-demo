import { useEffect } from 'react'
import type { RefObject } from 'react'
import { useFocusTrap } from '@/hooks/use-focus-trap'

// スクロール位置戻し・初期フォーカス・フォーカストラップ + Escape

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

  // Escape 閉じ
  useEffect(() => {
    if (!isVisible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isVisible, onClose])

  // フォーカストラップ
  useFocusTrap(isVisible, panelRef)
}
