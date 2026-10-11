// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest'
import { collectScrollableAncestors } from './scrollable-ancestors'

// getComputedStyle only reflects inline styles for elements connected to the
// document (happy-dom returns a blank computed style for detached elements),
// so every tree built here is appended to document.body before assertions.
function makeScrollable(overflowY: 'auto' | 'scroll' | 'visible' = 'auto'): HTMLElement {
  const el = document.createElement('div')
  el.style.overflowY = overflowY
  return el
}

describe('collectScrollableAncestors', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('returns an empty array when start is null', () => {
    const boundary = document.createElement('div')
    expect(collectScrollableAncestors(null, boundary)).toEqual([])
  })

  it('returns an empty array when start is the boundary itself', () => {
    const boundary = makeScrollable('auto')
    expect(collectScrollableAncestors(boundary, boundary)).toEqual([])
  })

  it('collects a single scrollable ancestor between start and boundary', () => {
    const boundary = document.createElement('div')
    const scrollable = makeScrollable('auto')
    const leaf = document.createElement('span')
    boundary.appendChild(scrollable)
    scrollable.appendChild(leaf)
    document.body.appendChild(boundary)
    expect(collectScrollableAncestors(leaf, boundary)).toEqual([scrollable])
  })

  it('includes the start element itself when it is scrollable', () => {
    const boundary = document.createElement('div')
    const scrollableStart = makeScrollable('scroll')
    boundary.appendChild(scrollableStart)
    document.body.appendChild(boundary)
    expect(collectScrollableAncestors(scrollableStart, boundary)).toEqual([scrollableStart])
  })

  it('skips ancestors whose overflowY is visible', () => {
    const boundary = document.createElement('div')
    const nonScrollable = makeScrollable('visible')
    const leaf = document.createElement('span')
    boundary.appendChild(nonScrollable)
    nonScrollable.appendChild(leaf)
    document.body.appendChild(boundary)
    expect(collectScrollableAncestors(leaf, boundary)).toEqual([])
  })

  it('orders results from nearest ancestor to farthest', () => {
    const boundary = document.createElement('div')
    const outer = makeScrollable('auto')
    const inner = makeScrollable('scroll')
    const leaf = document.createElement('span')
    boundary.appendChild(outer)
    outer.appendChild(inner)
    inner.appendChild(leaf)
    document.body.appendChild(boundary)
    expect(collectScrollableAncestors(leaf, boundary)).toEqual([inner, outer])
  })

  it('excludes the boundary node even if the boundary itself is scrollable', () => {
    const boundary = makeScrollable('auto')
    const middle = makeScrollable('auto')
    const leaf = document.createElement('span')
    boundary.appendChild(middle)
    middle.appendChild(leaf)
    document.body.appendChild(boundary)
    expect(collectScrollableAncestors(leaf, boundary)).toEqual([middle])
  })

  it('skips a non-HTML ancestor (SVG) even when its overflowY is auto', () => {
    const boundary = document.createElement('div')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.style.overflowY = 'auto'
    const leaf = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    boundary.appendChild(svg)
    svg.appendChild(leaf)
    document.body.appendChild(boundary)
    // SVG 自体はスクロール可能なスタイルを返す。除外しているのは HTMLElement の絞り込みだけ
    expect(window.getComputedStyle(svg).overflowY).toBe('auto')
    expect(collectScrollableAncestors(leaf, boundary)).toEqual([])
  })

  it('returns an empty array when start is not an Element', () => {
    const boundary = document.createElement('div')
    const textNode = document.createTextNode('text')
    expect(collectScrollableAncestors(textNode, boundary)).toEqual([])
  })
})
