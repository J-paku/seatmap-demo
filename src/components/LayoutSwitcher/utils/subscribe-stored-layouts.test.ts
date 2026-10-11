import { describe, expect, it } from 'vitest'
import { getServerStoredLayouts, subscribeStoredLayouts } from './subscribe-stored-layouts'

describe('getServerStoredLayouts', () => {
  it('静的書き出しHTMLと同じ「カスタム0件・デフォルト未設定」を返す', () => {
    expect(getServerStoredLayouts()).toEqual({ layoutMetas: [], defaultLayoutId: null })
  })

  it('呼ぶたびに同じ参照を返す(useSyncExternalStore のサーバースナップショットの要件)', () => {
    expect(getServerStoredLayouts()).toBe(getServerStoredLayouts())
  })
})

describe('subscribeStoredLayouts', () => {
  it('購読解除の関数を返し、呼んでも何もしない', () => {
    const unsubscribe = subscribeStoredLayouts()

    expect(typeof unsubscribe).toBe('function')
    expect(unsubscribe()).toBeUndefined()
  })

  it('何度購読しても同じ解除関数を返す', () => {
    expect(subscribeStoredLayouts()).toBe(subscribeStoredLayouts())
  })
})
