// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { suppressGhostClick } from './suppress-ghost-click'

function dispatchClick(target: HTMLElement): MouseEvent {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true })
  target.dispatchEvent(event)
  return event
}

describe('suppressGhostClick', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('prevents the next click and stops it from reaching bubble-phase listeners', () => {
    const background = document.createElement('div')
    document.body.appendChild(background)
    const onBackgroundClick = vi.fn()
    background.addEventListener('click', onBackgroundClick)

    suppressGhostClick()
    const event = dispatchClick(background)

    expect(event.defaultPrevented).toBe(true)
    expect(onBackgroundClick).not.toHaveBeenCalled()

    document.body.removeChild(background)
  })

  it('only suppresses a single click; a following click passes through normally', () => {
    const background = document.createElement('div')
    document.body.appendChild(background)
    const onBackgroundClick = vi.fn()
    background.addEventListener('click', onBackgroundClick)

    suppressGhostClick()
    dispatchClick(background)
    const secondEvent = dispatchClick(background)

    expect(secondEvent.defaultPrevented).toBe(false)
    expect(onBackgroundClick).toHaveBeenCalledTimes(1)

    document.body.removeChild(background)
  })

  it('auto-removes the listener once the ghost-click window elapses without a click', () => {
    vi.useFakeTimers()
    const background = document.createElement('div')
    document.body.appendChild(background)
    const onBackgroundClick = vi.fn()
    background.addEventListener('click', onBackgroundClick)

    suppressGhostClick()
    vi.advanceTimersByTime(350)
    const event = dispatchClick(background)

    expect(event.defaultPrevented).toBe(false)
    expect(onBackgroundClick).toHaveBeenCalledTimes(1)

    document.body.removeChild(background)
  })

  it('removes the capture listener with the same capture flag it was added with', () => {
    // happy-dom は removeEventListener の capture 指定を無視して外してしまうが、
    // ブラウザは capture が一致しないと外さず、以後の click を全て握りつぶし続ける。
    // そのため登録と解除の引数を突き合わせる
    const addSpy = vi.spyOn(document, 'addEventListener')
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const background = document.createElement('div')
    document.body.appendChild(background)

    suppressGhostClick()
    dispatchClick(background)

    expect(removeSpy.mock.calls).toEqual(addSpy.mock.calls)
    expect(removeSpy.mock.calls).toEqual([['click', expect.any(Function), true]])

    addSpy.mockRestore()
    removeSpy.mockRestore()
    document.body.removeChild(background)
  })

  it('leaves no pending timer once the ghost click has been suppressed', () => {
    vi.useFakeTimers()
    const background = document.createElement('div')
    document.body.appendChild(background)

    suppressGhostClick()
    expect(vi.getTimerCount()).toBe(1)
    dispatchClick(background)

    expect(vi.getTimerCount()).toBe(0)

    document.body.removeChild(background)
  })

  it('still suppresses a click that arrives just before the window elapses', () => {
    vi.useFakeTimers()
    const background = document.createElement('div')
    document.body.appendChild(background)
    const onBackgroundClick = vi.fn()
    background.addEventListener('click', onBackgroundClick)

    suppressGhostClick()
    vi.advanceTimersByTime(349)
    const event = dispatchClick(background)

    expect(event.defaultPrevented).toBe(true)
    expect(onBackgroundClick).not.toHaveBeenCalled()

    document.body.removeChild(background)
  })
})
