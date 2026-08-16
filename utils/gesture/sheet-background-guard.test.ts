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
    const scrollable = makeScrollableAncestor({ scrollTop: 0, clientHeight: 100, scrollHeight: 100 })
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
    const moveEvent = makeTouchEvent('touchmove', [makeTouch(child, 0, 20), makeTouch(child, 50, 20)])
    const spy = vi.spyOn(moveEvent, 'preventDefault')
    child.dispatchEvent(moveEvent)

    expect(spy).not.toHaveBeenCalled()
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
