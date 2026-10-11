import { describe, expect, it } from 'vitest'
import { subscribeNever } from './subscribe-never'

describe('subscribeNever', () => {
  it('購読解除の関数を返し、呼んでも何もしない', () => {
    const unsubscribe = subscribeNever()

    expect(typeof unsubscribe).toBe('function')
    expect(unsubscribe()).toBeUndefined()
  })

  it('何度購読しても同じ解除関数を返す', () => {
    expect(subscribeNever()).toBe(subscribeNever())
  })
})
