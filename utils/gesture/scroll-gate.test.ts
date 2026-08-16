// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest'
import { computeScrollGate } from './scroll-gate'

// scrollHeight/clientHeight are getter-only in happy-dom, so dimensions are
// mocked via Object.defineProperty as instructed for this test group.
// getComputedStyle only reflects inline styles for elements connected to the
// document (happy-dom returns a blank computed style for detached elements),
// so every tree built here is appended to document.body before assertions.
function makeElement(opts: {
  scrollHeight?: number
  clientHeight?: number
  scrollTop?: number
  overflowY?: string
}): HTMLElement {
  const el = document.createElement('div')
  Object.defineProperty(el, 'scrollHeight', {
    value: opts.scrollHeight ?? 0,
    configurable: true,
  })
  Object.defineProperty(el, 'clientHeight', {
    value: opts.clientHeight ?? 0,
    configurable: true,
  })
  el.scrollTop = opts.scrollTop ?? 0
  if (opts.overflowY) el.style.overflowY = opts.overflowY
  return el
}

describe('computeScrollGate', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('returns false when currentTarget is not an Element', () => {
    const target = makeElement({ scrollHeight: 200, clientHeight: 50, scrollTop: 10, overflowY: 'auto' })
    document.body.appendChild(target)
    expect(computeScrollGate(target, null)).toBe(false)
  })

  it('returns false when target is null even if currentTarget is a blocking element', () => {
    const currentTarget = makeElement({
      scrollHeight: 200,
      clientHeight: 50,
      scrollTop: 10,
      overflowY: 'auto',
    })
    document.body.appendChild(currentTarget)
    expect(computeScrollGate(null, currentTarget)).toBe(false)
  })

  it('returns false when no element in the chain is scrollable', () => {
    const currentTarget = makeElement({ overflowY: 'visible' })
    const leaf = document.createElement('span')
    currentTarget.appendChild(leaf)
    document.body.appendChild(currentTarget)
    expect(computeScrollGate(leaf, currentTarget)).toBe(false)
  })

  it('returns true when an intermediate ancestor is mid-scroll (blocking)', () => {
    const currentTarget = document.createElement('div')
    const middle = makeElement({
      scrollHeight: 300,
      clientHeight: 100,
      scrollTop: 20,
      overflowY: 'auto',
    })
    const leaf = document.createElement('span')
    currentTarget.appendChild(middle)
    middle.appendChild(leaf)
    document.body.appendChild(currentTarget)
    expect(computeScrollGate(leaf, currentTarget)).toBe(true)
  })

  it('returns true when currentTarget itself is blocking (checked before the loop breaks)', () => {
    const currentTarget = makeElement({
      scrollHeight: 300,
      clientHeight: 100,
      scrollTop: 20,
      overflowY: 'scroll',
    })
    document.body.appendChild(currentTarget)
    expect(computeScrollGate(currentTarget, currentTarget)).toBe(true)
  })

  it('returns false when the walk exhausts parentElement without ever reaching currentTarget', () => {
    // Non-blocking so the loop actually walks to a null parent instead of
    // short-circuiting true on the starting node itself.
    const unrelatedTarget = document.createElement('div')
    const unrelatedCurrentTarget = document.createElement('div')
    document.body.appendChild(unrelatedTarget)
    document.body.appendChild(unrelatedCurrentTarget)
    expect(computeScrollGate(unrelatedTarget, unrelatedCurrentTarget)).toBe(false)
  })

  it('treats scrollTop of exactly 1 as not blocking (iOS residual decimal boundary)', () => {
    const el = makeElement({ scrollHeight: 300, clientHeight: 100, scrollTop: 1, overflowY: 'auto' })
    document.body.appendChild(el)
    expect(computeScrollGate(el, el)).toBe(false)
  })

  it('treats scrollTop above 1 as blocking', () => {
    const el = makeElement({ scrollHeight: 300, clientHeight: 100, scrollTop: 1.5, overflowY: 'auto' })
    document.body.appendChild(el)
    expect(computeScrollGate(el, el)).toBe(true)
  })

  it('treats scrollHeight === clientHeight + 1 as not scrollable (boundary)', () => {
    const el = makeElement({ scrollHeight: 101, clientHeight: 100, scrollTop: 10, overflowY: 'auto' })
    document.body.appendChild(el)
    expect(computeScrollGate(el, el)).toBe(false)
  })

  it('treats scrollHeight === clientHeight + 2 as scrollable', () => {
    const el = makeElement({ scrollHeight: 102, clientHeight: 100, scrollTop: 10, overflowY: 'auto' })
    document.body.appendChild(el)
    expect(computeScrollGate(el, el)).toBe(true)
  })

  it('ignores a scrollable-sized element whose overflowY is visible', () => {
    const el = makeElement({ scrollHeight: 300, clientHeight: 100, scrollTop: 10, overflowY: 'visible' })
    document.body.appendChild(el)
    expect(computeScrollGate(el, el)).toBe(false)
  })
})
