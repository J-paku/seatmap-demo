import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { useBodyScrollLock } from '@/lib/use-body-scroll-lock'
import { useBackgroundInert } from '@/lib/use-background-inert'

export const SEATMAP_BG_ID = 'seatmap-bg-root'

type Props = {
  title: string
  variant: 'employee' | 'facility' | 'schedule'
  active: boolean // 最前面(フォーカストラップ対象)
  showHandle?: boolean
  onClose: () => void
  children: ReactNode
}

// スワイプ閉じ判定のしきい値(実測)
const SLOP = 10
const CLOSE_RATIO = 0.28
const FLICK_SPEED = 0.7 // px/ms

// 祖先チェーンに「スクロール可能かつ最上部でない」要素があるか(スクロールゲート)
const hasScrolledAncestor = (from: HTMLElement, stop: HTMLElement): boolean => {
  let el: HTMLElement | null = from
  while (el && el !== stop) {
    if (el.scrollHeight > el.clientHeight + 1 && el.scrollTop > 0) return true
    el = el.parentElement
  }
  return false
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])'

export const SheetShell = ({ title, variant, active, showHandle, onClose, children }: Props) => {
  const sheetRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const bodyId = useId()

  const drag = useRef({
    committed: false,
    fromHandle: false,
    startX: 0,
    startY: 0,
    samples: [] as Array<{ y: number; t: number }>,
    suppressClick: false,
  })

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

  const setSheetTransform = (y: number | null, transition: boolean) => {
    const el = sheetRef.current
    if (!el) return
    el.style.transition = transition ? 'transform 0.2s ease-out' : 'none'
    el.style.transform = y === null ? '' : `translateY(${y}px)`
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return // タッチ・ペンのみ
    const target = e.target as HTMLElement
    drag.current.fromHandle = target.dataset.handle === 'true'
    drag.current.committed = false
    drag.current.startX = e.clientX
    drag.current.startY = e.clientY
    drag.current.samples = [{ y: e.clientY, t: e.timeStamp }]
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return
    const d = drag.current
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    d.samples.push({ y: e.clientY, t: e.timeStamp })
    if (d.samples.length > 12) d.samples.shift()

    if (!d.committed) {
      // 上方優勢/水平優勢は放棄
      if (dy < -SLOP) return
      if (Math.abs(dx) > SLOP && Math.abs(dx) > dy) {
        d.suppressClick = true
        return
      }
      // コミット条件: 下方>10px かつ 下方>水平絶対値
      if (dy > SLOP && dy > Math.abs(dx)) {
        // スクロールゲート(ハンドルバー起点は免除)
        const startEl = e.target as HTMLElement
        if (!d.fromHandle && scrollRef.current && hasScrolledAncestor(startEl, scrollRef.current)) return
        d.committed = true
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      } else {
        return
      }
    }
    // 追従(オフセット=下方−10px)
    const offset = Math.max(0, dy - SLOP)
    setSheetTransform(offset, false)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return
    const d = drag.current
    if (d.suppressClick) {
      window.setTimeout(() => {
        d.suppressClick = false
      }, 0)
    }
    if (!d.committed) return
    d.committed = false
    const dy = e.clientY - d.startY
    const offset = Math.max(0, dy - SLOP)
    const height = sheetRef.current?.offsetHeight ?? 1
    // 直近100msの下方速度
    const now = e.timeStamp
    const recent = d.samples.filter((s) => now - s.t <= 100)
    let flick = 0
    if (recent.length >= 2) {
      const a = recent[0]
      const b = recent[recent.length - 1]
      flick = (b.y - a.y) / Math.max(1, b.t - a.t)
    }
    if (offset > height * CLOSE_RATIO || flick > FLICK_SPEED) {
      onClose()
    } else {
      setSheetTransform(null, true)
    }
  }

  const onPointerCancel = () => {
    drag.current.committed = false
    setSheetTransform(null, true)
  }

  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.suppressClick) {
      e.stopPropagation()
      e.preventDefault()
    }
  }

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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClickCapture={onClickCapture}
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
