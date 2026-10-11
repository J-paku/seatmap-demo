import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFocusTrap } from '@/hooks/use-focus-trap'

type AlertDialogRefs = {
  panelRef: RefObject<HTMLDivElement | null>
  confirmRef: RefObject<HTMLButtonElement | null>
}

// 開いたら確認ボタンへフォーカスし、閉じたら開く前の要素へ戻す
export const useAlertDialog = (isOpen: boolean): AlertDialogRefs => {
  const panelRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useFocusTrap(isOpen, panelRef)

  useEffect(() => {
    if (!isOpen) return
    restoreRef.current = document.activeElement as HTMLElement | null
    confirmRef.current?.focus()
    return () => restoreRef.current?.focus()
  }, [isOpen])

  return { panelRef, confirmRef }
}
