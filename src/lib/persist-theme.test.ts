// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readStoredTheme, writeStoredTheme } from '@/lib/persist-theme'

// lib/persist-theme.ts はキー定数を export していないため、直接読み書きの検証には
// 文字列を複製する必要がある(意図的な重複)
const THEME_STORAGE_KEY = 'seatmap-demo:theme'

// 読み書きのたびに例外を投げるストレージ(プライベートモード・容量超過の代わり)。
// happy-dom の localStorage へ直接 spyOn すると差し替えが後のテストへ残るため、window ごと差し替える
const stubThrowingStorage = () => {
  const getItem = vi.fn(() => {
    throw new Error('denied')
  })
  const setItem = vi.fn(() => {
    throw new Error('quota')
  })
  vi.stubGlobal('window', { localStorage: { getItem, setItem } })
  return { getItem, setItem }
}

describe('persist-theme', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('readStoredTheme', () => {
    it('未保存なら null を返す', () => {
      expect(readStoredTheme()).toBeNull()
    })

    it.each(['light', 'dracula', 'kuroxxx'])('保存済みの有効なテーマ %s をそのまま返す', mode => {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode)

      expect(readStoredTheme()).toBe(mode)
    })

    it('旧 dark の保存値は dracula へ移行して返す', () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, 'dark')

      expect(readStoredTheme()).toBe('dracula')
    })

    it('テーマとして無効な保存値は null を返す', () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, 'sepia')

      expect(readStoredTheme()).toBeNull()
    })

    it('別のキーに入った値は読まない', () => {
      window.localStorage.setItem('seatmap-demo:theme-other', 'dracula')

      expect(readStoredTheme()).toBeNull()
    })

    it('ストレージを読めない環境では null を返す', () => {
      const { getItem } = stubThrowingStorage()

      expect(readStoredTheme()).toBeNull()
      expect(getItem).toHaveBeenCalledWith(THEME_STORAGE_KEY)
    })

    it('window の無い環境(SSR)では null を返す', () => {
      vi.stubGlobal('window', undefined)

      expect(readStoredTheme()).toBeNull()
    })
  })

  describe('writeStoredTheme', () => {
    it('決まったキーへテーマを書く', () => {
      writeStoredTheme('kuroxxx')

      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('kuroxxx')
    })

    it('書いたテーマを readStoredTheme で読み戻せる', () => {
      writeStoredTheme('dracula')

      expect(readStoredTheme()).toBe('dracula')
    })

    it('ストレージへ書けない環境でも例外を投げない', () => {
      const { setItem } = stubThrowingStorage()

      expect(() => writeStoredTheme('light')).not.toThrow()
      expect(setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'light')
    })

    it('window の無い環境(SSR)でも例外を投げない', () => {
      vi.stubGlobal('window', undefined)

      expect(() => writeStoredTheme('light')).not.toThrow()
    })
  })
})
