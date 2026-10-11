import { describe, expect, it } from 'vitest'
import type { StoredAvatarRecord } from '@/types'
import { mergeByOwnerCode } from '@/utils/merge-avatar-records'

const makeRecord = (ownerCode: string, ownerName: string): StoredAvatarRecord => ({
  ownerCode,
  ownerName,
  config: { kind: 'preset', id: 'av1' },
  updatedTime: '2026-10-12T00:00:00.000Z',
})

describe('mergeByOwnerCode', () => {
  it('上書きが無ければ元の並びのまま返す', () => {
    const base = [makeRecord('0001', '甲'), makeRecord('0002', '乙')]

    expect(mergeByOwnerCode(base, [])).toEqual(base)
  })

  it('同じ ownerCode は上書き側が勝ち、元の位置に入る', () => {
    const base = [makeRecord('0001', '甲'), makeRecord('0002', '乙'), makeRecord('0003', '丙')]
    const override = makeRecord('0002', '乙・改')

    expect(mergeByOwnerCode(base, [override])).toEqual([base[0], override, base[2]])
  })

  it('元に無い ownerCode は末尾へ足す', () => {
    const base = [makeRecord('0001', '甲')]
    const added = makeRecord('0009', '新')

    expect(mergeByOwnerCode(base, [added])).toEqual([base[0], added])
  })

  it('上書き同士で ownerCode が重なれば後ろの方が勝つ', () => {
    const first = makeRecord('0001', '一回目')
    const second = makeRecord('0001', '二回目')

    expect(mergeByOwnerCode([], [first, second])).toEqual([second])
  })

  it('元の配列は書き換えない', () => {
    const base = [makeRecord('0001', '甲')]

    mergeByOwnerCode(base, [makeRecord('0001', '甲・改')])

    expect(base).toEqual([makeRecord('0001', '甲')])
  })
})
