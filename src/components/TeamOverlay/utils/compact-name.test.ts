import { describe, expect, it } from 'vitest'
import { compactNameFontSize, getCompactNameLabel } from './compact-name'
import * as displayUtils from '@/utils/display-utils'

describe('getCompactNameLabel', () => {
  it('姓の切り出しは utils/display-utils の実装をそのまま使う(判定基準を2つ持たない)', () => {
    expect(getCompactNameLabel).toBe(displayUtils.getCompactNameLabel)
  })
})

describe('compactNameFontSize', () => {
  it('ASCII だけの短い名前は 13px', () => {
    expect(compactNameFontSize('Smith')).toBe(13)
  })

  it('ASCII だけで 8 文字なら 13px のまま、9 文字以上で 8px に詰める', () => {
    expect(compactNameFontSize('Robinson')).toBe(13)
    expect(compactNameFontSize('Alexander')).toBe(8)
    expect(compactNameFontSize('Christopher')).toBe(8)
  })

  it('空白や記号も ASCII として数える', () => {
    expect(compactNameFontSize('O Neil-Jr')).toBe(8)
  })

  it('和名は 4 文字なら 13px のまま、5 文字以上で 12px に詰める', () => {
    expect(compactNameFontSize('山田')).toBe(13)
    expect(compactNameFontSize('長谷川太')).toBe(13)
    expect(compactNameFontSize('長谷川太郎')).toBe(12)
  })

  it('ASCII と和文が混ざる名前は和名の規則で測る', () => {
    // ASCII 規則なら 9 文字未満で 13px になるところ、和名の規則で 5 文字以上なので 12px
    expect(compactNameFontSize('山田Taro')).toBe(12)
    expect(compactNameFontSize('Taro山田')).toBe(12)
    // 9 文字以上でも、和文が1文字混ざれば ASCII 規則の 8px ではなく和名の規則の 12px
    expect(compactNameFontSize('Alex山ander')).toBe(12)
  })
})
