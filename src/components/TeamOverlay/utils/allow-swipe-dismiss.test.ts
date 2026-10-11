import { describe, expect, it } from 'vitest'
import { allowsSwipeDismiss } from './allow-swipe-dismiss'

describe('allowsSwipeDismiss', () => {
  it('開いていて Compact のときだけ受け付ける', () => {
    expect(allowsSwipeDismiss(true, true)).toBe(true)
  })

  it('開いていても Desktop では受け付けない', () => {
    expect(allowsSwipeDismiss(true, false)).toBe(false)
  })

  it('Compact でも閉じている間は受け付けない', () => {
    expect(allowsSwipeDismiss(false, true)).toBe(false)
  })

  it('閉じていて Desktop なら受け付けない', () => {
    expect(allowsSwipeDismiss(false, false)).toBe(false)
  })
})
