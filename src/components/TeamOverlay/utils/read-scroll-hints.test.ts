// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { isSameHints, readHints } from './read-scroll-hints'
import type { ScrollHints } from './read-scroll-hints'

// 幅とスクロール位置だけを決めた要素を作る(happy-dom はレイアウトを計算しないので実測値を上書きする)
const box = (scrollWidth: number, clientWidth: number, scrollLeft: number): HTMLElement => {
  const el = document.createElement('div')
  Object.defineProperty(el, 'scrollWidth', { value: scrollWidth })
  Object.defineProperty(el, 'clientWidth', { value: clientWidth })
  Object.defineProperty(el, 'scrollLeft', { value: scrollLeft })
  return el
}

const hints = (hasOverflow: boolean, atStart: boolean, atEnd: boolean): ScrollHints => ({
  hasOverflow,
  atStart,
  atEnd,
})

describe('readHints', () => {
  it('中身が箱に収まっていれば、はみ出しなし・両端に居る', () => {
    expect(readHints(box(300, 300, 0))).toEqual(hints(false, true, true))
  })

  it('はみ出しが 1px までなら丸め誤差とみなし、はみ出しなしにする', () => {
    expect(readHints(box(301, 300, 0)).hasOverflow).toBe(false)
    expect(readHints(box(302, 300, 0)).hasOverflow).toBe(true)
  })

  it('はみ出しは幅の差で見る(和ではない)', () => {
    expect(readHints(box(100, 100, 0)).hasOverflow).toBe(false)
  })

  it('左端から 1px までは左端に居るとみなす', () => {
    expect(readHints(box(500, 300, 1)).atStart).toBe(true)
    expect(readHints(box(500, 300, 2)).atStart).toBe(false)
  })

  it('右端の手前 1px までは右端に居るとみなす', () => {
    // はみ出し幅は 500 - 300 = 200
    expect(readHints(box(500, 300, 199)).atEnd).toBe(true)
    expect(readHints(box(500, 300, 198)).atEnd).toBe(false)
  })

  it('途中までスクロールしていれば、はみ出しあり・どちらの端にも居ない', () => {
    expect(readHints(box(500, 300, 100))).toEqual(hints(true, false, false))
  })
})

describe('isSameHints', () => {
  it('3つの値がすべて同じなら同じとみなす', () => {
    expect(isSameHints(hints(true, false, true), hints(true, false, true))).toBe(true)
  })

  it('はみ出しだけが違えば違うとみなす', () => {
    expect(isSameHints(hints(true, true, true), hints(false, true, true))).toBe(false)
  })

  it('左端かどうかだけが違えば違うとみなす', () => {
    expect(isSameHints(hints(true, true, true), hints(true, false, true))).toBe(false)
  })

  it('右端かどうかだけが違えば違うとみなす', () => {
    expect(isSameHints(hints(true, true, true), hints(true, true, false))).toBe(false)
  })
})
