import { useEffect } from 'react'

// 背景 root(id 指定)を無効化: aria-hidden + pointer-events:none + フォーカス可能要素の tabindex 退避
// inert 属性単独は一部 WebView で不安定なため複合実装。参照カウントで入れ子に対応
let inertCount = 0
const savedTabindex: Array<{ el: HTMLElement; prev: string | null }> = []
let savedAriaHidden: string | null = null
let savedPointerEvents = ''

const FOCUSABLE = 'a[href],button,input,textarea,select,[tabindex]'

export const useBackgroundInert = (active: boolean, rootId: string) => {
  useEffect(() => {
    if (!active) return
    const root = document.getElementById(rootId)
    if (!root) return
    if (inertCount === 0) {
      savedAriaHidden = root.getAttribute('aria-hidden')
      savedPointerEvents = root.style.pointerEvents
      root.setAttribute('aria-hidden', 'true')
      root.style.pointerEvents = 'none'
      root.querySelectorAll<HTMLElement>(FOCUSABLE).forEach((el) => {
        savedTabindex.push({ el, prev: el.getAttribute('tabindex') })
        el.setAttribute('tabindex', '-1')
      })
    }
    inertCount++
    return () => {
      inertCount--
      if (inertCount === 0) {
        if (savedAriaHidden === null) root.removeAttribute('aria-hidden')
        else root.setAttribute('aria-hidden', savedAriaHidden)
        root.style.pointerEvents = savedPointerEvents
        savedTabindex.forEach(({ el, prev }) => {
          if (prev === null) el.removeAttribute('tabindex')
          else el.setAttribute('tabindex', prev)
        })
        savedTabindex.length = 0
      }
    }
  }, [active, rootId])
}
