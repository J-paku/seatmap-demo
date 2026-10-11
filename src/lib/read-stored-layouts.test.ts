// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveDefaultLayoutId, saveLayoutMetas } from '@/lib/layout-persistence'
import type { LayoutMeta } from '@/types'

// getStoredLayouts はモジュール内に最初の読み込み結果を持ち続ける。テストごとに覚えを捨てて
// 読み直さないと、前のテストで読んだ写しが次のテストへ漏れる
let mod: typeof import('./read-stored-layouts')

beforeEach(async () => {
  vi.resetModules()
  mod = await import('./read-stored-layouts')
})

afterEach(() => {
  window.localStorage.clear()
})

const metaA: LayoutMeta = { layoutId: 'a', layoutName: 'レイアウトA', updatedAt: '2026-10-01' }
const metaB: LayoutMeta = { layoutId: 'b', layoutName: 'レイアウトB', updatedAt: '2026-10-02' }

describe('readStoredLayouts', () => {
  it('何も保存されていなければ一覧は空・デフォルトは未設定で返す', () => {
    expect(mod.readStoredLayouts()).toEqual({ layoutMetas: [], defaultLayoutId: null })
  })

  it('保存済みの一覧とデフォルトIDを1組にして返す', () => {
    saveLayoutMetas([metaA])
    saveDefaultLayoutId('a')

    expect(mod.readStoredLayouts()).toEqual({ layoutMetas: [metaA], defaultLayoutId: 'a' })
  })

  it('呼ぶたびに読み直すので、保存後の内容を返す', () => {
    saveLayoutMetas([metaA])
    mod.readStoredLayouts()
    saveLayoutMetas([metaA, metaB])
    saveDefaultLayoutId('b')

    expect(mod.readStoredLayouts()).toEqual({
      layoutMetas: [metaA, metaB],
      defaultLayoutId: 'b',
    })
  })
})

describe('getStoredLayouts', () => {
  it('最初の呼び出しで保存内容を読む', () => {
    saveLayoutMetas([metaA])
    saveDefaultLayoutId('a')

    expect(mod.getStoredLayouts()).toEqual({ layoutMetas: [metaA], defaultLayoutId: 'a' })
  })

  it('2回目以降は保存内容が変わっても最初に読んだ同じ参照を返す', () => {
    saveLayoutMetas([metaA])
    const first = mod.getStoredLayouts()
    saveLayoutMetas([metaA, metaB])
    saveDefaultLayoutId('b')

    const second = mod.getStoredLayouts()

    expect(second).toBe(first)
    expect(second).toEqual({ layoutMetas: [metaA], defaultLayoutId: null })
  })
})

describe('getServerStoredLayouts', () => {
  it('静的書き出しHTMLと同じ「カスタム0件・デフォルト未設定」を返す', () => {
    expect(mod.getServerStoredLayouts()).toEqual({ layoutMetas: [], defaultLayoutId: null })
  })

  it('保存内容があっても読まず、空のままを返す', () => {
    saveLayoutMetas([metaA])
    saveDefaultLayoutId('a')

    expect(mod.getServerStoredLayouts()).toEqual({ layoutMetas: [], defaultLayoutId: null })
  })

  it('呼ぶたびに同じ参照を返す(useSyncExternalStore のサーバースナップショットの要件)', () => {
    expect(mod.getServerStoredLayouts()).toBe(mod.getServerStoredLayouts())
  })
})
