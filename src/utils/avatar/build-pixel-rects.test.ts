import { describe, expect, it } from 'vitest'
import { buildRectsForPixels, buildRectsFromMatrix } from './build-pixel-rects'
import type { PixelsAvatarConfig } from '@/types'

// セルの値に # を付けた色を返す。null は透明
const hashColor = (cell: string | null): string | null => (cell ? `#${cell}` : null)

describe('buildRectsFromMatrix', () => {
  it('空のマトリクスなら rect は無い', () => {
    expect(buildRectsFromMatrix([], 4, hashColor)).toEqual([])
  })

  it('全セル透明の行は rect を作らない', () => {
    expect(buildRectsFromMatrix([[null, null, null]], 3, hashColor)).toEqual([])
  })

  it('行頭から続く同色セルを1つの rect にまとめ、色が変わったら次の rect を始める', () => {
    expect(buildRectsFromMatrix([['a', 'a', 'b', null]], 4, hashColor)).toEqual([
      { x: 0, y: 0, w: 2, color: '#a' },
      { x: 2, y: 0, w: 1, color: '#b' },
    ])
  })

  it('途中から始まる連続も、開始位置と幅を正しく持つ', () => {
    expect(buildRectsFromMatrix([[null, 'a', 'a', 'a', null]], 5, hashColor)).toEqual([
      { x: 1, y: 0, w: 3, color: '#a' },
    ])
  })

  it('透明セルを挟んだ同色は別の rect に分ける', () => {
    expect(buildRectsFromMatrix([['a', null, 'a']], 3, hashColor)).toEqual([
      { x: 0, y: 0, w: 1, color: '#a' },
      { x: 2, y: 0, w: 1, color: '#a' },
    ])
  })

  it('行末まで続く連続は gridSize を終端として幅を決める', () => {
    expect(buildRectsFromMatrix([[null, 'a', 'a']], 3, hashColor)).toEqual([
      { x: 1, y: 0, w: 2, color: '#a' },
    ])
    expect(buildRectsFromMatrix([[null, 'a']], 4, hashColor)).toEqual([
      { x: 1, y: 0, w: 3, color: '#a' },
    ])
  })

  it('別のセル値でも解決後の色が同じなら1つにまとめる', () => {
    const sameColor = (cell: string | null): string | null => (cell ? '#same' : null)

    expect(buildRectsFromMatrix([['a', 'b', 'c']], 3, sameColor)).toEqual([
      { x: 0, y: 0, w: 3, color: '#same' },
    ])
  })

  it('行ごとに y を振り、行をまたいで連続をつなげない', () => {
    expect(
      buildRectsFromMatrix(
        [
          ['a', 'a'],
          ['a', 'a'],
        ],
        2,
        hashColor
      )
    ).toEqual([
      { x: 0, y: 0, w: 2, color: '#a' },
      { x: 0, y: 1, w: 2, color: '#a' },
    ])
  })
})

describe('buildRectsForPixels', () => {
  const config: PixelsAvatarConfig = {
    kind: 'pixels',
    size: 16,
    palette: { a: '#111111', b: '#222222' },
    rows: ['aab.', '...............b', 'z.a'],
  }

  it('16x16 の行文字列をパレット色の rect にし、透明・パレットに無い文字は描かない', () => {
    expect(buildRectsForPixels(config)).toEqual([
      { x: 0, y: 0, w: 2, color: '#111111' },
      { x: 2, y: 0, w: 1, color: '#222222' },
      { x: 15, y: 1, w: 1, color: '#222222' },
      { x: 2, y: 2, w: 1, color: '#111111' },
    ])
  })

  it('全部透明なら rect は無い', () => {
    expect(buildRectsForPixels({ ...config, rows: [] })).toEqual([])
  })
})
