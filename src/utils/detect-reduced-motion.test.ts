// @vitest-environment happy-dom
import { afterEach, describe, it, expect, vi } from 'vitest'
import { prefersReducedMotion } from './detect-reduced-motion'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('prefersReducedMotion', () => {
  const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'

  // OS の「視差効果を減らす」設定を差し替える。問われたメディアクエリが一致するかだけを返す
  const stubReducedMotion = (reduce: boolean) => {
    vi.spyOn(window, 'matchMedia').mockImplementation(query => {
      const matches = reduce && query === REDUCE_QUERY
      return { media: query, matches } as MediaQueryList
    })
  }

  it('動きを減らす設定なら true', () => {
    stubReducedMotion(true)
    expect(prefersReducedMotion()).toBe(true)
  })

  it('動きを減らす設定でなければ false', () => {
    stubReducedMotion(false)
    expect(prefersReducedMotion()).toBe(false)
  })

  it('window の無い環境(サーバー描画)では false', () => {
    vi.stubGlobal('window', undefined)
    expect(prefersReducedMotion()).toBe(false)
  })
})
