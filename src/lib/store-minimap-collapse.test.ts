// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readStored, writeStored } from '@/lib/store-minimap-collapse'

// lib/store-minimap-collapse.ts はキーを export していないため、保存先を直接確かめるために複製する
const STORAGE_KEY = 'seatmap::minimap-open'

describe('store-minimap-collapse', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('readStored', () => {
    it('保存値が無ければ開いた状態(true)を返す', () => {
      expect(readStored()).toBe(true)
    })

    it('保存値が文字列 true なら true、false なら false を返す', () => {
      window.localStorage.setItem(STORAGE_KEY, 'true')
      expect(readStored()).toBe(true)

      window.localStorage.setItem(STORAGE_KEY, 'false')
      expect(readStored()).toBe(false)
    })

    it('true 以外の保存値は閉じた状態(false)として読む', () => {
      window.localStorage.setItem(STORAGE_KEY, 'open')
      expect(readStored()).toBe(false)
    })

    it('window が無い(SSR)ときはストレージに触れず開いた状態を返す', () => {
      vi.stubGlobal('window', undefined)
      expect(readStored()).toBe(true)
    })
  })

  describe('writeStored', () => {
    it('開閉状態を文字列にして決まったキーへ保存する', () => {
      writeStored(false)
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('false')

      writeStored(true)
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true')
    })

    it('保存した値を readStored がそのまま読み戻す', () => {
      writeStored(false)
      expect(readStored()).toBe(false)
    })

    it('書き込みが失敗しても例外を外へ出さない', () => {
      vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      expect(() => writeStored(true)).not.toThrow()
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    it('window が無い(SSR)ときも例外を外へ出さない', () => {
      vi.stubGlobal('window', undefined)
      expect(() => writeStored(true)).not.toThrow()
    })
  })
})
