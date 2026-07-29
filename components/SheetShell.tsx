import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { useBackgroundInert } from '@/hooks/use-background-inert'
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

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])'

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
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const sheet = sheetRef.current
      if (!sheet) return
      const items = [...sheet.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
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
  }, [active])

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
        {showHandle && <div className='sheet-handle-strip' data-handle='true'><span className='sheet-handle-bar' data-handle='true' /></div>}
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
