import { describe, expect, it } from 'vitest'
import { DRAFT_SEAT_ID_PREFIX, isSameIdSet } from './track-seat-draft'

describe('DRAFT_SEAT_ID_PREFIX', () => {
  it('下書きの仮 id は seat-draft- で始める', () => {
    expect(DRAFT_SEAT_ID_PREFIX).toBe('seat-draft-')
  })
})

describe('isSameIdSet', () => {
  it('空の集合どうしは同じとみなす', () => {
    expect(isSameIdSet(new Set(), new Set())).toBe(true)
  })

  it('入れた順が違っても中身が同じなら同じとみなす', () => {
    expect(isSameIdSet(new Set(['a', 'b', 'c']), new Set(['c', 'a', 'b']))).toBe(true)
  })

  it('件数が同じでも中身が1つ違えば違うとみなす', () => {
    expect(isSameIdSet(new Set(['a', 'b']), new Set(['a', 'c']))).toBe(false)
  })

  it('片方がもう片方を丸ごと含んでいても、件数が違えば違うとみなす', () => {
    expect(isSameIdSet(new Set(['a']), new Set(['a', 'b']))).toBe(false)
    expect(isSameIdSet(new Set(['a', 'b']), new Set(['a']))).toBe(false)
  })
})
