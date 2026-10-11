// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { attachSheetBackgroundGuard } from './sheet-background-guard'

function makeTouch(target: EventTarget, clientX: number, clientY: number): Touch {
  return new Touch({ identifier: 0, target, clientX, clientY })
}

function makeTouchEvent(
  type: 'touchstart' | 'touchmove',
  touches: Touch[],
  cancelable = true
): TouchEvent {
  return new TouchEvent(type, { bubbles: true, cancelable, touches })
}

// scrollHeight/clientHeight are getter-only in happy-dom, so dimensions are
// mocked via Object.defineProperty as instructed for this test group.
function makeScrollableAncestor(opts: {
  scrollTop: number
  clientHeight: number
  scrollHeight: number
}): HTMLElement {
  const el = document.createElement('div')
  el.style.overflowY = 'auto'
  Object.defineProperty(el, 'clientHeight', { value: opts.clientHeight, configurable: true })
  Object.defineProperty(el, 'scrollHeight', { value: opts.scrollHeight, configurable: true })
  el.scrollTop = opts.scrollTop
  return el
}

describe('attachSheetBackgroundGuard', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('does not preventDefault on a horizontally dominant move, even without a scrollable ancestor', () => {
    const node = document.createElement('div')
    const child = document.createElement('div')
    node.appendChild(child)
    attachSheetBackgroundGuard(node)

    child.dispatchEvent(makeTouchEvent('touchstart', [makeTouch(child, 0, 0)]))
    const moveEvent = makeTouchEvent('touchmove', [makeTouch(child, 20, 5)])
    const spy = vi.spyOn(moveEvent, 'preventDefault')
    child.dispatchEvent(moveEvent)

    expect(spy).not.toHaveBeenCalled()
  })

  it('preventDefaults a vertical drag when no scrollable ancestor sits between touch origin and node', () => {
    const node = document.createElement('div')
    const child = document.createElement('div')
    node.appendChild(child)
    attachSheetBackgroundGuard(node)

    child.dispatchEvent(makeTouchEvent('touchstart', [makeTouch(child, 0, 0)]))
    const moveEvent = makeTouchEvent('touchmove', [makeTouch(child, 0, 20)])
    const spy = vi.spyOn(moveEvent, 'preventDefault')
    child.dispatchEvent(moveEvent)

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('does not preventDefault a downward drag when the scrollable ancestor still has room to scroll up', () => {
    const node = document.createElement('div')
    const scrollable = makeScrollableAncestor({ scrollTop: 5, clientHeight: 50, scrollHeight: 200 })
    const child = document.createElement('div')
    node.appendChild(scrollable)
    scrollable.appendChild(child)
    document.body.appendChild(node)
    attachSheetBackgroundGuard(node)

    child.dispatchEvent(makeTouchEvent('touchstart', [makeTouch(child, 0, 0)]))
    const moveEvent = makeTouchEvent('touchmove', [makeTouch(child, 0, 20)])
    const spy = vi.spyOn(moveEvent, 'preventDefault')
    child.dispatchEvent(moveEvent)

    expect(spy).not.toHaveBeenCalled()
  })

  it('preventDefaults a downward drag when the scrollable ancestor is already at its top', () => {
    const node = document.createElement('div')
    const scrollable = makeScrollableAncestor({ scrollTop: 0, clientHeight: 50, scrollHeight: 200 })
    const child = document.createElement('div')
    node.appendChild(scrollable)
    scrollable.appendChild(child)
    document.body.appendChild(node)
    attachSheetBackgroundGuard(node)

    child.dispatchEvent(makeTouchEvent('touchstart', [makeTouch(child, 0, 0)]))
    const moveEvent = makeTouchEvent('touchmove', [makeTouch(child, 0, 20)])
    const spy = vi.spyOn(moveEvent, 'preventDefault')
    child.dispatchEvent(moveEvent)

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('does not preventDefault an upward drag when the scrollable ancestor still has room to scroll down', () => {
    const node = document.createElement('div')
    const scrollable = makeScrollableAncestor({ scrollTop: 0, clientHeight: 50, scrollHeight: 200 })
    const child = document.createElement('div')
    node.appendChild(scrollable)
    scrollable.appendChild(child)
    document.body.appendChild(node)
    attachSheetBackgroundGuard(node)

    child.dispatchEvent(makeTouchEvent('touchstart', [makeTouch(child, 0, 20)]))
    const moveEvent = makeTouchEvent('touchmove', [makeTouch(child, 0, 0)])
    const spy = vi.spyOn(moveEvent, 'preventDefault')
    child.dispatchEvent(moveEvent)

    expect(spy).not.toHaveBeenCalled()
  })

  it('preventDefaults an upward drag when the scrollable ancestor is already at its bottom', () => {
    const node = document.createElement('div')
    const scrollable = makeScrollableAncestor({
      scrollTop: 0,
      clientHeight: 100,
      scrollHeight: 100,
    })
    const child = document.createElement('div')
    node.appendChild(scrollable)
    scrollable.appendChild(child)
    document.body.appendChild(node)
    attachSheetBackgroundGuard(node)

    child.dispatchEvent(makeTouchEvent('touchstart', [makeTouch(child, 0, 20)]))
    const moveEvent = makeTouchEvent('touchmove', [makeTouch(child, 0, 0)])
    const spy = vi.spyOn(moveEvent, 'preventDefault')
    child.dispatchEvent(moveEvent)

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('does not preventDefault when the move event is not cancelable (inertial scroll)', () => {
    const node = document.createElement('div')
    const child = document.createElement('div')
    node.appendChild(child)
    attachSheetBackgroundGuard(node)

    child.dispatchEvent(makeTouchEvent('touchstart', [makeTouch(child, 0, 0)]))
    const moveEvent = makeTouchEvent('touchmove', [makeTouch(child, 0, 20)], false)
    const spy = vi.spyOn(moveEvent, 'preventDefault')
    child.dispatchEvent(moveEvent)

    expect(spy).not.toHaveBeenCalled()
  })

  it('ignores multi-touch gestures on touchmove, even in an otherwise-blocking scenario', () => {
    const node = document.createElement('div')
    const child = document.createElement('div')
    node.appendChild(child)
    attachSheetBackgroundGuard(node)

    child.dispatchEvent(makeTouchEvent('touchstart', [makeTouch(child, 0, 0)]))
    const moveEvent = makeTouchEvent('touchmove', [
      makeTouch(child, 0, 20),
      makeTouch(child, 50, 20),
    ])
    const spy = vi.spyOn(moveEvent, 'preventDefault')
    child.dispatchEvent(moveEvent)

    expect(spy).not.toHaveBeenCalled()
  })

  it('actually cancels the native pan on a blocked vertical drag (touchmove is not passive)', () => {
    const node = document.createElement('div')
    const child = document.createElement('div')
    node.appendChild(child)
    attachSheetBackgroundGuard(node)

    child.dispatchEvent(makeTouchEvent('touchstart', [makeTouch(child, 0, 0)]))
    const moveEvent = makeTouchEvent('touchmove', [makeTouch(child, 0, 20)])
    child.dispatchEvent(moveEvent)

    expect(moveEvent.defaultPrevented).toBe(true)
  })

  it('measures the drag direction from the touch origin, not from the viewport origin', () => {
    const node = document.createElement('div')
    const child = document.createElement('div')
    node.appendChild(child)
    attachSheetBackgroundGuard(node)

    child.dispatchEvent(makeTouchEvent('touchstart', [makeTouch(child, 100, 0)]))
    // 起点 (100,0) から (5,20) 動いた縦ドラッグ。画面座標そのままなら横優勢に見える
    const moveEvent = makeTouchEvent('touchmove', [makeTouch(child, 105, 20)])
    const spy = vi.spyOn(moveEvent, 'preventDefault')
    child.dispatchEvent(moveEvent)

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('treats an exactly diagonal drag as vertical and blocks it', () => {
    const node = document.createElement('div')
    const child = document.createElement('div')
    node.appendChild(child)
    attachSheetBackgroundGuard(node)

    child.dispatchEvent(makeTouchEvent('touchstart', [makeTouch(child, 0, 0)]))
    const moveEvent = makeTouchEvent('touchmove', [makeTouch(child, 20, 20)])
    const spy = vi.spyOn(moveEvent, 'preventDefault')
    child.dispatchEvent(moveEvent)

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('treats a zero-displacement move like an upward drag (yields while there is room below)', () => {
    const node = document.createElement('div')
    const scrollable = makeScrollableAncestor({ scrollTop: 0, clientHeight: 50, scrollHeight: 200 })
    const child = document.createElement('div')
    node.appendChild(scrollable)
    scrollable.appendChild(child)
    document.body.appendChild(node)
    attachSheetBackgroundGuard(node)

    child.dispatchEvent(makeTouchEvent('touchstart', [makeTouch(child, 0, 10)]))
    const moveEvent = makeTouchEvent('touchmove', [makeTouch(child, 0, 10)])
    const spy = vi.spyOn(moveEvent, 'preventDefault')
    child.dispatchEvent(moveEvent)

    expect(spy).not.toHaveBeenCalled()
  })

  it('treats a residual scrollTop of exactly 1px as being at the top (iOS momentum leftover)', () => {
    const node = document.createElement('div')
    const scrollable = makeScrollableAncestor({ scrollTop: 1, clientHeight: 50, scrollHeight: 200 })
    const child = document.createElement('div')
    node.appendChild(scrollable)
    scrollable.appendChild(child)
    document.body.appendChild(node)
    attachSheetBackgroundGuard(node)

    child.dispatchEvent(makeTouchEvent('touchstart', [makeTouch(child, 0, 0)]))
    const moveEvent = makeTouchEvent('touchmove', [makeTouch(child, 0, 20)])
    const spy = vi.spyOn(moveEvent, 'preventDefault')
    child.dispatchEvent(moveEvent)

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('treats a scrollable within 1px of its bottom as being at the bottom', () => {
    const node = document.createElement('div')
    const scrollable = makeScrollableAncestor({ scrollTop: 0, clientHeight: 99, scrollHeight: 100 })
    const child = document.createElement('div')
    node.appendChild(scrollable)
    scrollable.appendChild(child)
    document.body.appendChild(node)
    attachSheetBackgroundGuard(node)

    child.dispatchEvent(makeTouchEvent('touchstart', [makeTouch(child, 0, 20)]))
    const moveEvent = makeTouchEvent('touchmove', [makeTouch(child, 0, 0)])
    const spy = vi.spyOn(moveEvent, 'preventDefault')
    child.dispatchEvent(moveEvent)

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('registers touchstart as passive and touchmove as non-passive', () => {
    const node = document.createElement('div')
    const addSpy = vi.spyOn(node, 'addEventListener')
    attachSheetBackgroundGuard(node)

    // touchstart は既定動作を止めないので passive にしてスクロール開始を待たせない。
    // touchmove は止める側なので明示的に非 passive(既定が passive になる要素でも効かせる)
    expect(addSpy.mock.calls).toEqual([
      ['touchstart', expect.any(Function), { passive: true }],
      ['touchmove', expect.any(Function), { passive: false }],
    ])
  })

  it('cleanup removes exactly the listeners it registered', () => {
    const node = document.createElement('div')
    const addSpy = vi.spyOn(node, 'addEventListener')
    const removeSpy = vi.spyOn(node, 'removeEventListener')
    const cleanup = attachSheetBackgroundGuard(node)
    cleanup()

    const registered = addSpy.mock.calls.map(([type, listener]) => [type, listener])
    expect(removeSpy.mock.calls).toEqual(registered)
  })

  it('keeps the single-touch origin when a multi-touch touchstart follows', () => {
    const node = document.createElement('div')
    const child = document.createElement('div')
    node.appendChild(child)
    attachSheetBackgroundGuard(node)

    child.dispatchEvent(makeTouchEvent('touchstart', [makeTouch(child, 0, 0)]))
    // 2本目の指が乗った touchstart では起点を x=100 へ動かさない
    child.dispatchEvent(
      makeTouchEvent('touchstart', [makeTouch(child, 100, 0), makeTouch(child, 150, 0)])
    )
    // 起点 (0,0) からは縦ドラッグ。起点が (100,0) へずれていれば横優勢で素通しになる
    const moveEvent = makeTouchEvent('touchmove', [makeTouch(child, 5, 20)])
    const spy = vi.spyOn(moveEvent, 'preventDefault')
    child.dispatchEvent(moveEvent)

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('stops guarding after the returned cleanup function is called', () => {
    const node = document.createElement('div')
    const child = document.createElement('div')
    node.appendChild(child)
    const cleanup = attachSheetBackgroundGuard(node)
    cleanup()

    child.dispatchEvent(makeTouchEvent('touchstart', [makeTouch(child, 0, 0)]))
    const moveEvent = makeTouchEvent('touchmove', [makeTouch(child, 0, 20)])
    const spy = vi.spyOn(moveEvent, 'preventDefault')
    child.dispatchEvent(moveEvent)

    expect(spy).not.toHaveBeenCalled()
  })
})
