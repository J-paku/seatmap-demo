import { useEffect } from 'react'
import type { RefObject } from 'react'

// 開いた直後のフォーカス・スクロール位置戻し・Escape 閉じ・背景膜のスクロール遮断

export const useDialogShell = (
  closeBtnRef: RefObject<HTMLButtonElement | null>,
  scrollRef: RefObject<HTMLElement | null>,
  backdropRef: RefObject<HTMLElement | null>,
  onClose: () => void
): void => {
  // 開いた直後に閉じるボタンへフォーカス
  useEffect(() => {
    const id = requestAnimationFrame(() => closeBtnRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [closeBtnRef])

  // マウント時に必ずスクロール位置を先頭へ戻す
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [scrollRef])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // 背景膜の native touchmove/wheel を遮断
  useEffect(() => {
    const el = backdropRef.current
    if (!el) return
    const block = (e: Event) => e.preventDefault()
    el.addEventListener('touchmove', block, { passive: false })
    el.addEventListener('wheel', block, { passive: false })
    return () => {
      el.removeEventListener('touchmove', block)
      el.removeEventListener('wheel', block)
    }
  }, [backdropRef])
}
