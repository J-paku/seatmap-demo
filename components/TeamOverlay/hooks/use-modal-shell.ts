import { useEffect } from 'react'
import type { RefObject } from 'react'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { useFocusTrap } from '@/hooks/use-focus-trap'

// body スクロールロック・Escape 閉じ・フォーカストラップ。いずれも PC / モバイル共通

export const useModalShell = (
  isOpen: boolean,
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void
): void => {
  // body スクロールロック(参照カウント式・他パネルとの同時オープンに対応)
  useBodyScrollLock(isOpen)

  // Escape 閉じ。DetailPanels が document 段で stopPropagation して2段スタックの
  // 同時クローズを防いでいるため、こちらは必ず window 側に置く
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // フォーカストラップ
  useFocusTrap(isOpen, panelRef)
}
