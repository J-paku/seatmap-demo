// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFavoriteIds, writeFavoriteIds } from '@/lib/seat/favorite-employees'

// lib/seat/favorite-employees.ts はキー定数を export していないため、旧形式の残存データを
// 実際のキーへ書き込んで検証するには文字列を複製する必要がある(意図的な重複)
const FAVORITES_STORAGE_KEY = 'seatmap-demo:favorites'

describe('favorite-employees', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('空状態', () => {
    it('キー未設定時は空集合を返す', () => {
      const result = readFavoriteIds()

      expect(result.size).toBe(0)
    })
  })

  describe('保存 → 読み込みの往復', () => {
    it('書き込んだ集合と同じ内容が読める', () => {
      writeFavoriteIds(new Set(['emp-001', 'emp-002']))

      const result = readFavoriteIds()

      expect(result).toEqual(new Set(['emp-001', 'emp-002']))
    })

    it('空集合を書き込むとキーは配列[]として保存される', () => {
      writeFavoriteIds(new Set())

      expect(localStorage.getItem(FAVORITES_STORAGE_KEY)).toBe('[]')
      expect(readFavoriteIds().size).toBe(0)
    })
  })

  describe('旧スキーマ・破損データ(無効化手段のないキャッシュ対策の回帰テスト)', () => {
    it('配列でないJSON(オブジェクト形式の旧保存分)はSetへ変換できず空集合へ落ちる', () => {
      // 「お気に入りID」をオブジェクトのマップで持っていた想定の旧形式データを実際に書き込む
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify({ 'emp-001': true }))

      const result = readFavoriteIds()

      expect(result.size).toBe(0)
    })

    it('パース不能な生文字列(JSON化されていない旧値)も空集合へ落ちる', () => {
      localStorage.setItem(FAVORITES_STORAGE_KEY, 'emp-001,emp-002')

      const result = readFavoriteIds()

      expect(result.size).toBe(0)
    })
  })

  describe('quota超過(setItemがthrow)', () => {
    it('writeFavoriteIds はキャッチせず例外をそのまま伝播する', () => {
      const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      expect(() => writeFavoriteIds(new Set(['emp-001']))).toThrow('QuotaExceededError')

      spy.mockRestore()
    })
  })
})
