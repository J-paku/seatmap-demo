import { describe, expect, it } from 'vitest'
import { getServerStoredLayouts } from './subscribe-stored-layouts'

describe('getServerStoredLayouts', () => {
  it('静的書き出しHTMLと同じ「カスタム0件・デフォルト未設定」を返す', () => {
    expect(getServerStoredLayouts()).toEqual({ layoutMetas: [], defaultLayoutId: null })
  })

  it('呼ぶたびに同じ参照を返す(useSyncExternalStore のサーバースナップショットの要件)', () => {
    expect(getServerStoredLayouts()).toBe(getServerStoredLayouts())
  })
})
