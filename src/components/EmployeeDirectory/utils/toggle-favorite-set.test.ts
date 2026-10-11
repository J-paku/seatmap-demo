import { describe, it, expect } from 'vitest'
import { createEmptySet, toggleSetValue } from './toggle-favorite-set'

describe('createEmptySet', () => {
  it('呼ぶたびに別の空集合を返す', () => {
    const first = createEmptySet()
    const second = createEmptySet()

    expect(first).toEqual(new Set())
    expect(first).not.toBe(second)
  })
})

describe('toggleSetValue', () => {
  it('無い値は足した新しい集合を返し、元の集合は変えない', () => {
    const current = new Set(['a'])

    const next = toggleSetValue(current, 'b')

    expect(next).toEqual(new Set(['a', 'b']))
    expect(current).toEqual(new Set(['a']))
  })

  it('ある値は除いた新しい集合を返し、元の集合は変えない', () => {
    const current = new Set(['a', 'b'])

    const next = toggleSetValue(current, 'a')

    expect(next).toEqual(new Set(['b']))
    expect(current).toEqual(new Set(['a', 'b']))
  })
})
