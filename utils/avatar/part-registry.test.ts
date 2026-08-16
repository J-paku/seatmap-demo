import { describe, it, expect } from 'vitest'
import {
  HAIR_LABELS,
  FACE_LABELS,
  ACCESSORY_LABELS,
  HAIR_OPTION_GROUPS,
  HAIR_OPTIONS,
  FACE_OPTIONS,
  ACCESSORY_OPTIONS,
  OUTFIT_OPTIONS,
} from './part-registry'

describe('HAIR_LABELS / FACE_LABELS / ACCESSORY_LABELS', () => {
  it('各 ID に対して登録どおりのラベルを返す', () => {
    expect(HAIR_LABELS.short).toBe('ショート')
    expect(HAIR_LABELS.kuroxxx).toBe('ヒドル帽')
    expect(FACE_LABELS.slit).toBe('クール')
    expect(FACE_LABELS.happy).toBe('ハッピー')
    expect(ACCESSORY_LABELS.none).toBe('なし')
    expect(ACCESSORY_LABELS.bow).toBe('ピンクリボン')
  })

  it('FACE_LABELS のキー順は FACE_OPTIONS と完全一致する (登録順が同じ配列から派生)', () => {
    expect(Object.keys(FACE_LABELS)).toEqual(FACE_OPTIONS)
  })

  it('ACCESSORY_LABELS のキー順は ACCESSORY_OPTIONS と完全一致する', () => {
    expect(Object.keys(ACCESSORY_LABELS)).toEqual(ACCESSORY_OPTIONS)
  })

  it('HAIR_LABELS は hidden 扱いの kuroxxx を含めて全21種を持つ', () => {
    expect(Object.keys(HAIR_LABELS)).toHaveLength(21)
    expect(Object.keys(HAIR_LABELS)).toContain('kuroxxx')
  })
})

describe('HAIR_OPTION_GROUPS', () => {
  it('common / male / female の各グループに代表 ID が正しく分類される', () => {
    expect(HAIR_OPTION_GROUPS.common).toContain('short')
    expect(HAIR_OPTION_GROUPS.male).toContain('mohawk')
    expect(HAIR_OPTION_GROUPS.female).toContain('bob')
  })

  it('hidden グループの kuroxxx はどのグループにも属さない', () => {
    expect(HAIR_OPTION_GROUPS.common).not.toContain('kuroxxx')
    expect(HAIR_OPTION_GROUPS.male).not.toContain('kuroxxx')
    expect(HAIR_OPTION_GROUPS.female).not.toContain('kuroxxx')
  })

  it('3グループの合計は HAIR_OPTIONS の件数(20件)と一致し重複がない', () => {
    const all = [
      ...HAIR_OPTION_GROUPS.common,
      ...HAIR_OPTION_GROUPS.male,
      ...HAIR_OPTION_GROUPS.female,
    ]
    expect(all).toHaveLength(HAIR_OPTIONS.length)
    expect(new Set(all).size).toBe(all.length)
    expect(new Set(all)).toEqual(new Set(HAIR_OPTIONS))
  })
})

describe('*_OPTIONS 配列', () => {
  it('HAIR_OPTIONS は kuroxxx (hidden) を含まない20件で重複がない', () => {
    expect(HAIR_OPTIONS).toHaveLength(20)
    expect(HAIR_OPTIONS).not.toContain('kuroxxx')
    expect(new Set(HAIR_OPTIONS).size).toBe(20)
  })

  it('FACE_OPTIONS は8件で重複がない', () => {
    expect(FACE_OPTIONS).toHaveLength(8)
    expect(new Set(FACE_OPTIONS).size).toBe(8)
  })

  it('ACCESSORY_OPTIONS は none を先頭に含む9件で重複がない', () => {
    expect(ACCESSORY_OPTIONS).toHaveLength(9)
    expect(ACCESSORY_OPTIONS[0]).toBe('none')
    expect(new Set(ACCESSORY_OPTIONS).size).toBe(9)
  })

  it('OUTFIT_OPTIONS は solid を先頭に含む11件で重複がない', () => {
    expect(OUTFIT_OPTIONS).toHaveLength(11)
    expect(OUTFIT_OPTIONS[0]).toBe('solid')
    expect(new Set(OUTFIT_OPTIONS).size).toBe(11)
  })
})
