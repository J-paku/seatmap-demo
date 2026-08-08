import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { useBackgroundInert } from '@/hooks/use-background-inert'
import { useFocusTrap } from '@/hooks/use-focus-trap'
import { useSwipeDismiss } from '@/hooks/use-swipe-dismiss'
import styles from './sheet.module.css'

const VARIANT_CLASS = {
  employee: styles.employee,
  facility: styles.facility,
  schedule: styles.schedule,
} as const


export const SEATMAP_BG_ID = 'seatmap-bg-root'

type Props = {
  title: string
  variant: 'employee' | 'facility' | 'schedule'
  active: boolean // 最前面(フォーカストラップ対象)
  onClose: () => void
  children: ReactNode
  // true の時は共通の .sheet-header(タイトル+閉じるボタン)を描かず、見出しは children 側に委ねる
  headerless?: boolean
}

// シートは中央モーダルになったため、ボトムシートの持ち手(SheetHandle)は置かない。
// 下スワイプで閉じる挙動は残っており、スクロール最上部からの下方ドラッグで発火する
export const SheetShell = ({ title, variant, active, onClose, children, headerless = false }: Props) => {
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const bodyId = useId()

  const { sheetRef, bind } = useSwipeDismiss({ onClose, scrollGateRef: scrollRef })

  useBodyScrollLock(true)
  useBackgroundInert(true, SEATMAP_BG_ID)

  // 出現直後に初期フォーカスを移す。headerless は children 側の [data-sheet-initial-focus]
  // 要素(無ければシート本体)へ、通常は共通ヘッダーの閉じるボタンへ
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (headerless) {
        const target = sheetRef.current?.querySelector<HTMLElement>('[data-sheet-initial-focus]')
        ;(target ?? sheetRef.current)?.focus()
        return
      }
      closeBtnRef.current?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [headerless, sheetRef])

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
      <div ref={backdropRef} className={styles.backdrop} onClick={onClose} />
      <div
        ref={sheetRef}
        className={`${styles.sheet} ${VARIANT_CLASS[variant]}`}
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={headerless ? -1 : undefined}
        {...bind}
      >
        <div ref={scrollRef} className={styles.scroll}>
          {headerless ? (
            // 見出しは children 側で表示済みなので、ここでは aria-labelledby の参照先だけ残す
            <h2 id={titleId} className='sr-only'>
              {title}
            </h2>
          ) : (
            <div className={styles.header}>
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
              <button ref={closeBtnRef} type='button' className={styles.close} aria-label='パネルを閉じる' onClick={onClose}>
                ✕
              </button>
            </div>
          )}
          <div id={bodyId}>{children}</div>
        </div>
      </div>
    </>
  )
}
