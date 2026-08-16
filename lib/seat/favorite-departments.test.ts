// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFavoriteDepartments, writeFavoriteDepartments } from '@/lib/seat/favorite-departments'

// lib/seat/favorite-departments.ts はキー定数を export していないため、旧形式の残存データを
// 実際のキーへ書き込んで検証するには文字列を複製する必要がある(意図的な重複)
const FAVORITE_DEPARTMENTS_STORAGE_KEY = 'seatmap-demo:favorite-departments'

describe('favorite-departments', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('空状態', () => {
    it('キー未設定時は空集合を返す', () => {
      const result = readFavoriteDepartments()

      expect(result.size).toBe(0)
    })
  })

  describe('保存 → 読み込みの往復', () => {
    it('書き込んだ集合と同じ内容が読める', () => {
      writeFavoriteDepartments(new Set(['営業部', '開発部']))

      const result = readFavoriteDepartments()

      expect(result).toEqual(new Set(['営業部', '開発部']))
    })

    it('空集合を書き込むとキーは配列[]として保存される', () => {
      writeFavoriteDepartments(new Set())

      expect(localStorage.getItem(FAVORITE_DEPARTMENTS_STORAGE_KEY)).toBe('[]')
      expect(readFavoriteDepartments().size).toBe(0)
    })
  })

  describe('旧スキーマ・破損データ(無効化手段のないキャッシュ対策の回帰テスト)', () => {
    it('配列でないJSON(オブジェクト形式の旧保存分)はSetへ変換できず空集合へ落ちる', () => {
      // 「選択中の部署」をオブジェクトで持っていた想定の旧形式データを実際に書き込む
      localStorage.setItem(FAVORITE_DEPARTMENTS_STORAGE_KEY, JSON.stringify({ selected: ['営業部'] }))

      const result = readFavoriteDepartments()

      expect(result.size).toBe(0)
    })

    it('パース不能な生文字列(JSON化されていない旧値)も空集合へ落ちる', () => {
      localStorage.setItem(FAVORITE_DEPARTMENTS_STORAGE_KEY, '営業部,開発部')

      const result = readFavoriteDepartments()

      expect(result.size).toBe(0)
    })

    it('null値が保存されていた場合も空集合へ落ちる', () => {
      localStorage.setItem(FAVORITE_DEPARTMENTS_STORAGE_KEY, JSON.stringify(null))

      const result = readFavoriteDepartments()

      expect(result.size).toBe(0)
    })
  })

  describe('quota超過(setItemがthrow)', () => {
    it('writeFavoriteDepartments はキャッチせず例外をそのまま伝播する', () => {
      const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      expect(() => writeFavoriteDepartments(new Set(['営業部']))).toThrow('QuotaExceededError')

      spy.mockRestore()
    })
  })
})
