// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { applyTheme } from '@/utils/apply-theme'

// utils/apply-theme.ts は当て先のセレクタを export していないため、当て先の要素は
// 同じクラス名で作る(意図的な重複)
const makeRoot = (): HTMLElement => {
  const root = document.createElement('div')
  root.className = 'seat-map-root'
  document.body.append(root)
  return root
}

describe('applyTheme', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('ダーク系テーマは data-theme にテーマ名を入れ、dark クラスを付ける', () => {
    const root = makeRoot()

    applyTheme('dracula')

    expect(root.getAttribute('data-theme')).toBe('dracula')
    expect(root.classList.contains('dark')).toBe(true)
  })

  it('テーマを替えると data-theme を上書きする', () => {
    const root = makeRoot()

    applyTheme('dracula')
    applyTheme('kuroxxx')

    expect(root.getAttribute('data-theme')).toBe('kuroxxx')
    expect(root.classList.contains('dark')).toBe(true)
  })

  it('light は data-theme を外し、dark クラスも外す', () => {
    const root = makeRoot()
    applyTheme('dracula')

    applyTheme('light')

    expect(root.hasAttribute('data-theme')).toBe(false)
    expect(root.classList.contains('dark')).toBe(false)
  })

  it('当て先の要素が無ければ何もせず例外も投げない', () => {
    const other = document.createElement('div')
    document.body.append(other)

    expect(() => applyTheme('dracula')).not.toThrow()
    expect(other.hasAttribute('data-theme')).toBe(false)
    expect(other.classList.contains('dark')).toBe(false)
  })
})
