// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getServerSessionAuthSnapshot,
  getSessionAuthSnapshot,
  subscribeSessionAuth,
  writeSessionAuth,
} from '@/lib/session-auth'

// lib/session-auth.ts はキー定数を export していないため、直接読み書きの検証には
// 文字列を複製する必要がある(意図的な重複)
const SESSION_AUTH_KEY = 'seatmap-demo/session-auth'

describe('session-auth', () => {
  const unsubscribers: Array<() => void> = []

  beforeEach(() => {
    window.sessionStorage.clear()
  })

  afterEach(() => {
    // モジュール内の listeners Set はファイル内でモジュールインスタンスが共有されるため、
    // テストごとに登録した購読を必ず解除して次のテストへ漏れさせない
    unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe())
    vi.restoreAllMocks()
  })

  describe('SSRスナップショット', () => {
    it('getServerSessionAuthSnapshot は常にnull(書き出されるHTMLは必ずゲート)', () => {
      expect(getServerSessionAuthSnapshot()).toBeNull()

      writeSessionAuth('user-1')

      expect(getServerSessionAuthSnapshot()).toBeNull()
    })
  })

  describe('空状態', () => {
    it('getSessionAuthSnapshot はキー未設定時 null を返す', () => {
      expect(getSessionAuthSnapshot()).toBeNull()
    })
  })

  describe('書き込み → 読み込みの往復', () => {
    it('writeSessionAuthの後、getSessionAuthSnapshotは生のJSON文字列をそのまま返す', () => {
      writeSessionAuth('user-1')

      expect(getSessionAuthSnapshot()).toBe(JSON.stringify({ loginId: 'user-1' }))
    })

    it('sessionStorageに直接書いた不正なJSON文字列でもパースせずそのまま返す(検証を持たない実装)', () => {
      window.sessionStorage.setItem(SESSION_AUTH_KEY, 'not valid json')

      expect(getSessionAuthSnapshot()).toBe('not valid json')
    })
  })

  describe('購読通知', () => {
    it('writeSessionAuthを呼ぶと購読中のリスナーへ通知する', () => {
      const listener = vi.fn()
      const unsubscribe = subscribeSessionAuth(listener)
      unsubscribers.push(unsubscribe)

      writeSessionAuth('user-1')

      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('購読解除後はwriteSessionAuthを呼んでも通知されない', () => {
      const listener = vi.fn()
      const unsubscribe = subscribeSessionAuth(listener)
      unsubscribe()

      writeSessionAuth('user-1')

      expect(listener).not.toHaveBeenCalled()
    })

    it('複数の購読者全員へ通知する', () => {
      const listenerA = vi.fn()
      const listenerB = vi.fn()
      unsubscribers.push(subscribeSessionAuth(listenerA))
      unsubscribers.push(subscribeSessionAuth(listenerB))

      writeSessionAuth('user-1')

      expect(listenerA).toHaveBeenCalledTimes(1)
      expect(listenerB).toHaveBeenCalledTimes(1)
    })
  })

  describe('quota超過・アクセス不可(setItem/getItemがthrow)', () => {
    it('writeSessionAuth: setItemがthrowしても例外を投げず、購読者へは通知する', () => {
      const listener = vi.fn()
      unsubscribers.push(subscribeSessionAuth(listener))
      vi.spyOn(window.sessionStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      expect(() => writeSessionAuth('user-1')).not.toThrow()
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('getSessionAuthSnapshot: getItemがthrowするとnullを返す(未ログイン扱い)', () => {
      vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError')
      })

      expect(getSessionAuthSnapshot()).toBeNull()
    })
  })
})
