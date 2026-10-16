import { describe, expect, it } from 'vitest'
import { isCustomSaveConflict, isUpdateConflict } from './judge-save-conflict'
import type { LayoutSource } from '@/contexts/layout-source-context'

const OFFICIAL: LayoutSource = { type: 'official', floorId: 'floor-1' }
const CUSTOM: LayoutSource = { type: 'custom', layoutId: 'custom-1' }

const KNOWN_TIME = '2026-10-16T00:00:00.000Z'
const OTHER_TIME = '2026-10-16T00:00:05.000Z'

describe('isUpdateConflict', () => {
  it('読み直した保存分が無ければ照合する相手が無いので衝突なし', () => {
    expect(isUpdateConflict(KNOWN_TIME, null)).toBe(false)
  })

  it('手元の版と保存分の版が同じなら衝突なし', () => {
    expect(isUpdateConflict(KNOWN_TIME, { updatedTime: KNOWN_TIME })).toBe(false)
  })

  it('保存分の版が手元と違えば、別タブが先に上書きしているので衝突', () => {
    expect(isUpdateConflict(KNOWN_TIME, { updatedTime: OTHER_TIME })).toBe(true)
  })

  it('手元が版を持たないのに保存分があれば衝突', () => {
    expect(isUpdateConflict(undefined, { updatedTime: KNOWN_TIME })).toBe(true)
  })
})

describe('isCustomSaveConflict', () => {
  it('カスタムで版が食い違えば衝突', () => {
    expect(isCustomSaveConflict(CUSTOM, KNOWN_TIME, { updatedTime: OTHER_TIME })).toBe(true)
  })

  it('カスタムでも版が同じなら衝突なし', () => {
    expect(isCustomSaveConflict(CUSTOM, KNOWN_TIME, { updatedTime: KNOWN_TIME })).toBe(false)
  })

  it('カスタムでも読み直した保存分が無ければ衝突なし', () => {
    expect(isCustomSaveConflict(CUSTOM, KNOWN_TIME, null)).toBe(false)
  })

  it('公式は版が食い違っても照合しない(仕様上競合検知なし)', () => {
    expect(isCustomSaveConflict(OFFICIAL, KNOWN_TIME, { updatedTime: OTHER_TIME })).toBe(false)
  })
})
