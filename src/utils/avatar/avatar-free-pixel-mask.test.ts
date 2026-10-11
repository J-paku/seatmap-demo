import { describe, it, expect } from 'vitest'
import { normalizeFreePixelRows } from '@/utils/avatar/avatar-free-pixel-mask'

describe('avatar-free-pixel-mask', () => {
  it('should preserve row count when normalizing', () => {
    const rows = Array(16).fill('................')
    const palette = { skin: '#F0C49A', outfit: '#3B6EA8' }
    const result = normalizeFreePixelRows(rows, palette)
    expect(result.length).toBe(16)
  })

  it('should preserve non-empty rows after normalization', () => {
    const rows = Array(16).fill('................')
    const palette = { skin: '#F0C49A', outfit: '#3B6EA8' }
    const result = normalizeFreePixelRows(rows, palette)
    result.forEach((row, idx) => {
      expect(typeof row).toBe('string')
      expect(row.length).toBeGreaterThan(0)
    })
  })

  it('should return an array of strings', () => {
    const rows = Array(16).fill('................')
    const palette = { skin: '#F0C49A', outfit: '#3B6EA8' }
    const result = normalizeFreePixelRows(rows, palette)
    expect(Array.isArray(result)).toBe(true)
    result.forEach(row => {
      expect(typeof row).toBe('string')
    })
  })

  it('should handle fully transparent face mask', () => {
    const rows = [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ]
    const palette = { skin: '#F0C49A', outfit: '#3B6EA8' }
    const result = normalizeFreePixelRows(rows, palette)
    expect(result).toBeDefined()
    expect(result.length).toBe(16)
  })

  it('should handle empty palette gracefully', () => {
    const rows = Array(16).fill('................')
    const palette = {}
    const result = normalizeFreePixelRows(rows, palette)
    expect(result).toBeDefined()
  })

  it('should not modify rows with sufficient fill', () => {
    const rows = Array(16).fill('ssssssssoooooooo')
    const palette = { s: '#F0C49A', o: '#3B6EA8' }
    const result = normalizeFreePixelRows(rows, palette)
    expect(result.join('')).toBe(rows.join(''))
  })
})

const BLANK_ROW = '.'.repeat(16)
const repeatLine = (count: number, line: string): string[] => Array<string>(count).fill(line)

// 顔マスク (row4-9 の col4-11) と体マスク (row12-15) の中身だけを指定し、残りは '.' で埋める
const buildRows = (face: string[], outfit: string[]): string[] => [
  ...repeatLine(4, BLANK_ROW),
  ...face.map(line => `....${line}....`),
  ...repeatLine(2, BLANK_ROW),
  ...outfit,
]

const OPAQUE_FACE = repeatLine(6, 'kkkkkkkk')
const OPAQUE_OUTFIT = repeatLine(4, 'o'.repeat(16))
const KO_PALETTE = { k: '#26222B', o: '#3B6EA8' }

describe('normalizeFreePixelRows — 過半が透明なマスクだけを埋める', () => {
  it('顔マスクの透明セルがちょうど半分 (48 中 24) なら埋めずにそのまま返す', () => {
    const rows = buildRows(repeatLine(6, '....kkkk'), OPAQUE_OUTFIT)
    expect(normalizeFreePixelRows(rows, KO_PALETTE)).toEqual(rows)
  })

  it('顔マスクの透明セルが半分を超える (48 中 25) と「.」のセルだけを s で埋め、不透明セルは残す', () => {
    const face = ['.....kkk', ...repeatLine(5, '....kkkk')]
    const result = normalizeFreePixelRows(buildRows(face, OPAQUE_OUTFIT), KO_PALETTE)
    expect(result).toEqual(buildRows(['ssssskkk', ...repeatLine(5, 'sssskkkk')], OPAQUE_OUTFIT))
  })

  it('体マスクの透明セルがちょうど半分 (64 中 32) なら埋めずにそのまま返す', () => {
    const rows = buildRows(OPAQUE_FACE, repeatLine(4, '........oooooooo'))
    expect(normalizeFreePixelRows(rows, KO_PALETTE)).toEqual(rows)
  })

  it('体マスクの透明セルが半分を超える (64 中 33) と「.」のセルだけを o で埋め、不透明セルは残す', () => {
    const outfit = ['.........kkkkkkk', ...repeatLine(3, '........kkkkkkkk')]
    const result = normalizeFreePixelRows(buildRows(OPAQUE_FACE, outfit), KO_PALETTE)
    const filled = ['oooooooookkkkkkk', ...repeatLine(3, 'ooooooookkkkkkkk')]
    expect(result).toEqual(buildRows(OPAQUE_FACE, filled))
  })

  it('palette に無い文字も透明として数えるが、埋めるのは「.」のセルだけ', () => {
    const rows = buildRows(repeatLine(6, 'xxxx....'), OPAQUE_OUTFIT)
    const result = normalizeFreePixelRows(rows, KO_PALETTE)
    expect(result).toEqual(buildRows(repeatLine(6, 'xxxxssss'), OPAQUE_OUTFIT))
  })

  it('palette に「.」キーがあっても「.」は透明として数えて埋める', () => {
    const rows = buildRows(repeatLine(6, '........'), OPAQUE_OUTFIT)
    const result = normalizeFreePixelRows(rows, { ...KO_PALETTE, '.': '#FFFFFF' })
    expect(result).toEqual(buildRows(repeatLine(6, 'ssssssss'), OPAQUE_OUTFIT))
  })

  it('16 文字に満たない行は、欠けた列も透明として数えて埋める', () => {
    const rows = buildRows(OPAQUE_FACE, [...repeatLine(3, BLANK_ROW), '..........'])
    const result = normalizeFreePixelRows(rows, KO_PALETTE)
    expect(result).toEqual(buildRows(OPAQUE_FACE, OPAQUE_OUTFIT))
  })

  it('行が欠けていても、欠けた行を透明として数え、半分以下なら例外を投げずそのまま返す', () => {
    // row15 が無い 15 行。体マスクの透明セルは row15 の 16 個だけ
    const rows = buildRows(OPAQUE_FACE, repeatLine(3, 'o'.repeat(16)))
    expect(normalizeFreePixelRows(rows, KO_PALETTE)).toEqual(rows)
  })
})

describe('normalizeFreePixelRows — 埋めるキーの選び方', () => {
  it('palette に skin キーがあれば、顔の透明セルを s ではなく skin キーで埋める', () => {
    const rows = buildRows(repeatLine(6, '........'), OPAQUE_OUTFIT)
    const result = normalizeFreePixelRows(rows, { hair: '#2A1A0F', skin: '#F0C49A' })
    // キーは 1 セルに 1 つ入るので、skin キーの行は 16 文字より長くなる
    expect(result[4]).toBe(`....${'skin'.repeat(8)}....`)
    expect(result[9]).toBe(`....${'skin'.repeat(8)}....`)
    expect(result.slice(12)).toEqual(OPAQUE_OUTFIT)
  })

  it('palette に outfit キーがあれば、体の透明セルを o ではなく outfit キーで埋める', () => {
    const rows = buildRows(OPAQUE_FACE, repeatLine(4, BLANK_ROW))
    const result = normalizeFreePixelRows(rows, { hair: '#2A1A0F', outfit: '#3B6EA8' })
    expect(result.slice(0, 12)).toEqual(rows.slice(0, 12))
    expect(result.slice(12)).toEqual(repeatLine(4, 'outfit'.repeat(16)))
  })
})
