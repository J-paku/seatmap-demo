import { describe, expect, it } from 'vitest'
import { minimapLabelStyle, singleLineLabel, truncateLabel } from './minimap-label'

const LARGE = { maxChars: 14, fontSize: 10 }
const MEDIUM = { maxChars: 11, fontSize: 9 }
const SMALL = { maxChars: 9, fontSize: 8 }

describe('minimapLabelStyle', () => {
  it('幅も高さも大きい枠は 14 文字・10px', () => {
    expect(minimapLabelStyle(0.3, 0.2)).toEqual(LARGE)
  })

  it('幅比 0.18・高さ比 0.12 ちょうどは大きい枠に入れない', () => {
    expect(minimapLabelStyle(0.18, 0.2)).toEqual(MEDIUM)
    expect(minimapLabelStyle(0.3, 0.12)).toEqual(MEDIUM)
  })

  it('幅が広くても高さが足りなければ中くらいの 11 文字・9px', () => {
    expect(minimapLabelStyle(0.3, 0.05)).toEqual(MEDIUM)
  })

  it('高さが足りても幅が狭ければ大きい枠にしない', () => {
    expect(minimapLabelStyle(0.15, 0.2)).toEqual(MEDIUM)
    expect(minimapLabelStyle(0.05, 0.2)).toEqual(SMALL)
  })

  it('幅比 0.11 以下は小さい枠の 9 文字・8px', () => {
    expect(minimapLabelStyle(0.11, 0.05)).toEqual(SMALL)
    expect(minimapLabelStyle(0.12, 0.05)).toEqual(MEDIUM)
  })
})

describe('truncateLabel', () => {
  it('上限以内の名前はそのまま返す', () => {
    expect(truncateLabel('営業部', 5)).toBe('営業部')
    expect(truncateLabel('営業第一部', 5)).toBe('営業第一部')
  })

  it('上限を超えた分は先頭から上限文字数だけ残して … を付ける', () => {
    expect(truncateLabel('営業第一部門', 5)).toBe('営業第一部…')
    expect(truncateLabel('Engineering', 3)).toBe('Eng…')
  })
})

describe('singleLineLabel', () => {
  it('改行や連続した空白を1つの半角空白にまとめる', () => {
    expect(singleLineLabel('営業\n第一部')).toBe('営業 第一部')
    expect(singleLineLabel('A  \n B\t\tC')).toBe('A B C')
  })

  it('前後の空白は落とす', () => {
    expect(singleLineLabel('  開発部 \n')).toBe('開発部')
  })

  it('空白を含まない名前はそのまま返す', () => {
    expect(singleLineLabel('総務部')).toBe('総務部')
  })
})
