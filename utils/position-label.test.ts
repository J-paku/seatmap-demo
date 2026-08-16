import { describe, it, expect } from 'vitest'
import { formatPositionLabel } from './position-label'

describe('formatPositionLabel', () => {
  it('null を渡すと null を返す', () => {
    expect(formatPositionLabel(null)).toBeNull()
  })

  it('undefined を渡すと null を返す', () => {
    expect(formatPositionLabel(undefined)).toBeNull()
  })

  it('空文字を渡すと null を返す', () => {
    expect(formatPositionLabel('')).toBeNull()
  })

  it('末尾の全角括弧区分を除去する', () => {
    expect(formatPositionLabel('課長代理（管理職）')).toBe('課長代理')
  })

  it('区分接尾辞が無ければそのまま返す', () => {
    expect(formatPositionLabel('主任')).toBe('主任')
  })

  it('括弧除去後に残る末尾の全角空白もトリムする', () => {
    expect(formatPositionLabel('部長（管理職）　')).toBe('部長')
  })

  it('全体が区分表記のみの場合は除去後に空文字となり null を返す', () => {
    expect(formatPositionLabel('（管理職）')).toBeNull()
  })

  it('末尾以外にある全角括弧は除去せずそのまま残す', () => {
    expect(formatPositionLabel('（テスト）主任（管理職）')).toBe('（テスト）主任')
  })

  it('半角括弧は区分表記として扱わず除去しない', () => {
    expect(formatPositionLabel('主任(A)')).toBe('主任(A)')
  })
})
