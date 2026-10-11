// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { triggerHaptic } from './haptic'
import type { HapticType } from './haptic'

describe('triggerHaptic', () => {
  it('window に「haptic」という CustomEvent を発火し、detail に指定した type を積む', () => {
    const handler = vi.fn()
    window.addEventListener('haptic', handler)
    triggerHaptic('success')
    expect(handler).toHaveBeenCalledTimes(1)
    const event = handler.mock.calls[0][0] as CustomEvent<HapticType>
    expect(event).toBeInstanceOf(CustomEvent)
    expect(event.type).toBe('haptic')
    expect(event.detail).toBe('success')
    window.removeEventListener('haptic', handler)
  })

  it('引数を省略すると type は既定値 light になる', () => {
    const handler = vi.fn()
    window.addEventListener('haptic', handler)
    triggerHaptic()
    const event = handler.mock.calls[0][0] as CustomEvent<HapticType>
    expect(event.detail).toBe('light')
    window.removeEventListener('haptic', handler)
  })

  it('呼び出すたびにイベントが発火し、それぞれの detail が呼び出し順に対応する', () => {
    const handler = vi.fn()
    window.addEventListener('haptic', handler)
    triggerHaptic('medium')
    triggerHaptic('error')
    expect(handler).toHaveBeenCalledTimes(2)
    expect((handler.mock.calls[0][0] as CustomEvent<HapticType>).detail).toBe('medium')
    expect((handler.mock.calls[1][0] as CustomEvent<HapticType>).detail).toBe('error')
    window.removeEventListener('haptic', handler)
  })

  it('haptic 以外の名前ではイベントを発火しない', () => {
    const handler = vi.fn()
    window.addEventListener('other-event', handler)
    triggerHaptic('light')
    expect(handler).not.toHaveBeenCalled()
    window.removeEventListener('other-event', handler)
  })
})
