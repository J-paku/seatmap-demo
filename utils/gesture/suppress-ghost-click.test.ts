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
