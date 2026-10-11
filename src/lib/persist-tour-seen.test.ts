// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { markSeen, readSeen } from './persist-tour-seen'

const KEY = 'seatmap-demo/test-tour-seen'

afterEach(() => {
  // window を外したテストの後でも片付けが届くよう、先に元へ戻す
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe('readSeen', () => {
  it('キーが無ければ未読(false)', () => {
    expect(readSeen(KEY)).toBe(false)
  })

  it("値が '1' なら既読(true)", () => {
    window.localStorage.setItem(KEY, '1')

    expect(readSeen(KEY)).toBe(true)
  })

  it("旧表記 'true' や空文字でも、キーがあれば既読(true)", () => {
    window.localStorage.setItem(KEY, 'true')
    expect(readSeen(KEY)).toBe(true)

    window.localStorage.setItem(KEY, '')
    expect(readSeen(KEY)).toBe(true)
  })

  it('別のキーの既読は見ない', () => {
    window.localStorage.setItem('seatmap-demo/other-tour-seen', '1')

    expect(readSeen(KEY)).toBe(false)
  })

  it('localStorage の参照が例外を投げる環境では、未読(false)として再生を続ける', () => {
    const getItem = vi.fn(() => {
      throw new Error('SecurityError')
    })
    vi.stubGlobal('window', { localStorage: { getItem } })

    expect(readSeen(KEY)).toBe(false)
    expect(getItem).toHaveBeenCalledWith(KEY)
  })

  it('window の無い環境(SSR)では既読(true)にして自動表示を止める', () => {
    vi.stubGlobal('window', undefined)

    expect(readSeen(KEY)).toBe(true)
  })
})

describe('markSeen', () => {
  it("キーへ '1' を書き、以後 readSeen が既読を返す", () => {
    markSeen(KEY)

    expect(window.localStorage.getItem(KEY)).toBe('1')
    expect(readSeen(KEY)).toBe(true)
  })

  it('保存が例外を投げても外へ投げない', () => {
    const setItem = vi.fn(() => {
      throw new Error('QuotaExceededError')
    })
    vi.stubGlobal('window', { localStorage: { setItem } })

    expect(() => markSeen(KEY)).not.toThrow()
    expect(setItem).toHaveBeenCalledWith(KEY, '1')
  })

  it('window の無い環境(SSR)では何もせず、例外も投げない', () => {
    vi.stubGlobal('window', undefined)

    expect(() => markSeen(KEY)).not.toThrow()
  })
})
