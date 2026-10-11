// 背景 root(id 指定)を無効化: aria-hidden + pointer-events:none + フォーカス可能要素の tabindex 退避
// inert 属性単独は一部 WebView で不安定なため複合実装。参照カウントで入れ子に対応
let inertCount = 0
const savedTabindex: Array<{ el: HTMLElement; prev: string | null }> = []
let savedAriaHidden: string | null = null
// 戻す前には必ず数 0 からの無効化が退避しているので、初期値は読まれない。持たせない
let savedPointerEvents: string

const FOCUSABLE = 'a[href],button,input,textarea,select,[tabindex]'

// 最初の1回だけ root の状態を退避して無効化する。以降は参照カウントを積むだけ
export const applyBackgroundInert = (root: HTMLElement): void => {
  if (inertCount === 0) {
    savedAriaHidden = root.getAttribute('aria-hidden')
    savedPointerEvents = root.style.pointerEvents
    root.setAttribute('aria-hidden', 'true')
    root.style.pointerEvents = 'none'
    root.querySelectorAll<HTMLElement>(FOCUSABLE).forEach(el => {
      savedTabindex.push({ el, prev: el.getAttribute('tabindex') })
      el.setAttribute('tabindex', '-1')
    })
  }
  inertCount++
}

// 参照カウントを1つ下ろし、0 になった時だけ退避した状態へ戻す
export const releaseBackgroundInert = (root: HTMLElement): void => {
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
