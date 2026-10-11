// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { safeSetPointerCapture } from './pointer-capture'

describe('safeSetPointerCapture', () => {
  it('delegates to element.setPointerCapture with the given pointerId', () => {
    const element = document.createElement('div')
    const spy = vi.fn()
    element.setPointerCapture = spy
    safeSetPointerCapture(element, 42)
    expect(spy).toHaveBeenCalledWith(42)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('swallows a NotFoundError thrown for an inactive pointerId without throwing', () => {
    const element = document.createElement('div')
    element.setPointerCapture = vi.fn(() => {
      throw new DOMException('The object can not be found here.', 'NotFoundError')
    })
    expect(() => safeSetPointerCapture(element, 1)).not.toThrow()
  })

  it('swallows any other error type thrown by setPointerCapture', () => {
    const element = document.createElement('div')
    element.setPointerCapture = vi.fn(() => {
      throw new Error('unexpected failure')
    })
    expect(() => safeSetPointerCapture(element, 1)).not.toThrow()
  })

  it('returns undefined regardless of success or failure', () => {
    const okElement = document.createElement('div')
    okElement.setPointerCapture = vi.fn()
    expect(safeSetPointerCapture(okElement, 5)).toBeUndefined()

    const failingElement = document.createElement('div')
    failingElement.setPointerCapture = vi.fn(() => {
      throw new Error('boom')
    })
    expect(safeSetPointerCapture(failingElement, 5)).toBeUndefined()
  })
})
