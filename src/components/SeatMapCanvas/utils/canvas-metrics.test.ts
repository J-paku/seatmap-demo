// @vitest-environment happy-dom
import { afterEach, describe, it, expect, vi } from 'vitest'
import { isModalOpen, lodOf } from './canvas-metrics'

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

const appendDialog = (attrs: Record<string, string>) => {
  const el = document.createElement('div')
  Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, value))
  document.body.append(el)
}

describe('isModalOpen', () => {
  it('aria-modal=true のダイアログがあれば true', () => {
    appendDialog({ role: 'dialog', 'aria-modal': 'true' })
    expect(isModalOpen()).toBe(true)
  })

  it('ダイアログが無ければ false', () => {
    expect(isModalOpen()).toBe(false)
  })

  it('aria-modal が無い・false のダイアログ(非モーダル)では false', () => {
    appendDialog({ role: 'dialog' })
    appendDialog({ role: 'dialog', 'aria-modal': 'false' })
    expect(isModalOpen()).toBe(false)
  })

  it('aria-modal=true でも role が dialog でなければ false', () => {
    appendDialog({ 'aria-modal': 'true' })
    expect(isModalOpen()).toBe(false)
  })

  it('document の無い環境(サーバー描画)では false', () => {
    vi.stubGlobal('document', undefined)
    expect(isModalOpen()).toBe(false)
  })
})

describe('lodOf', () => {
  it('倍率 0.5 以上は detail', () => {
    expect(lodOf(0.5)).toBe('detail')
    expect(lodOf(2)).toBe('detail')
  })

  it('倍率 0.3 以上 0.5 未満は mid', () => {
    expect(lodOf(0.49)).toBe('mid')
    expect(lodOf(0.3)).toBe('mid')
  })

  it('倍率 0.3 未満は overview', () => {
    expect(lodOf(0.29)).toBe('overview')
    expect(lodOf(0.1)).toBe('overview')
  })
})
