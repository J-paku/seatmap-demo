import { describe, expect, it } from 'vitest'
import { layoutSwrKey } from '@/utils/build-layout-key'

describe('layoutSwrKey', () => {
  it.each([
    ['floor-1', 'mock/layout-override:floor-1'],
    ['floor-2', 'mock/layout-override:floor-2'],
  ] as const)('公式は %s の上書き用のキー %s を返す', (floorId, expected) => {
    expect(layoutSwrKey({ type: 'official', floorId }, floorId)).toBe(expected)
  })

  it('カスタムは引数のフロアidではなく source のレイアウトidでキーを作る', () => {
    expect(layoutSwrKey({ type: 'custom', layoutId: 'custom-1' }, 'floor-2')).toBe(
      'mock/layout:custom-1'
    )
  })
})
