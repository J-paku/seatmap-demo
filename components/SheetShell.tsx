import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { useBackgroundInert } from '@/hooks/use-background-inert'
import { useFocusTrap } from '@/hooks/use-focus-trap'
import { SheetHandle } from './SheetHandle'
import { useSwipeDismiss } from '@/hooks/use-swipe-dismiss'

export const SEATMAP_BG_ID = 'seatmap-bg-root'

type Props = {
  title: string
  variant: 'employee' | 'facility' | 'schedule'
  active: boolean // 最前面(フォーカストラップ対象)
  showHandle?: boolean
  onClose: () => void
  children: ReactNode
}

export const SheetShell = ({ title, variant, active, showHandle, onClose, children }: Props) => {
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const bodyId = useId()

  const { sheetRef, bind } = useSwipeDismiss({ onClose, scrollGateRef: scrollRef })

  useBodyScrollLock(true)
  useBackgroundInert(true, SEATMAP_BG_ID)

  // 出現直後に閉じるボタンへフォーカス
  useEffect(() => {
    const id = requestAnimationFrame(() => closeBtnRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [])

  // マウント時に必ずスクロール位置を先頭へ戻す
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [])

  // フォーカストラップ(最前面のみ)
  useFocusTrap(active, sheetRef)

  // 背景膜の native touchmove/wheel を遮断(passive:false)
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
  }, [])

  return (
    <>
      <div ref={backdropRef} className='sheet-backdrop' onClick={onClose} />
      <div
        ref={sheetRef}
        className={`sheet sheet-${variant}`}
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        {...bind}
      >
        {showHandle && (
          <SheetHandle stripClassName='sheet-handle-strip' barClassName='sheet-handle-bar' onClose={onClose} />
        )}
        <div ref={scrollRef} className='sheet-scroll'>
          <div className='sheet-header'>
            <h2 id={titleId} className='sheet-title'>
              {title}
            </h2>
            <button ref={closeBtnRef} type='button' className='sheet-close' aria-label='パネルを閉じる' onClick={onClose}>
              ✕
            </button>
          </div>
          <div id={bodyId}>{children}</div>
        </div>
      </div>
    </>
  )
}
