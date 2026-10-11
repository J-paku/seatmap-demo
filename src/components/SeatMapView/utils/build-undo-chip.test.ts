import { describe, it, expect } from 'vitest'
import { placedMessageOf, recentOf, undoChipRequestOf } from './build-undo-chip'
import type { GhostRequest } from '@/components/GhostPlacementLayer'

type Target = GhostRequest['target']

const RECT = { x: 10, y: 20, w: 40, h: 30 }

const addFacility: Target = {
  type: 'add-facility',
  facility: { facilityId: 'F-01', name: '会議室A', kana: 'かいぎしつえー' },
}
const addFurniture: Target = { type: 'add-furniture', furnitureKind: 'sofa' }
const addTeam: Target = { type: 'add-team', name: '開発部', color: 'blue' }
const repositionOf = (kind: 'seat' | 'team' | 'facility' | 'furniture'): Target => ({
  type: 'reposition',
  ref: { kind, id: 'x-1' },
})

describe('recentOf', () => {
  it('置いた会議室は会議室として強調する', () => {
    expect(recentOf(addFacility, RECT)).toEqual({ kind: 'facility', rect: RECT })
  })

  it('置いた家具は家具として強調する', () => {
    expect(recentOf(addFurniture, RECT)).toEqual({ kind: 'furniture', rect: RECT })
  })

  it('動かした会議室・家具は動かした対象の種別で強調する', () => {
    expect(recentOf(repositionOf('facility'), RECT)).toEqual({ kind: 'facility', rect: RECT })
    expect(recentOf(repositionOf('furniture'), RECT)).toEqual({ kind: 'furniture', rect: RECT })
  })

  it('チーム枠は置いても動かしても強調しない', () => {
    expect(recentOf(addTeam, RECT)).toBeNull()
    expect(recentOf(repositionOf('team'), RECT)).toBeNull()
  })

  it('座席の掴み直しは強調しない', () => {
    expect(recentOf(repositionOf('seat'), RECT)).toBeNull()
  })
})

describe('placedMessageOf', () => {
  it('掴み直しは「移動しました」', () => {
    expect(placedMessageOf(repositionOf('facility'))).toBe('移動しました')
  })

  it('新しく置いたものは種別に依らず「配置しました」', () => {
    expect(placedMessageOf(addFacility)).toBe('配置しました')
    expect(placedMessageOf(addFurniture)).toBe('配置しました')
    expect(placedMessageOf(addTeam)).toBe('配置しました')
  })
})

describe('undoChipRequestOf', () => {
  it('チップの基点は対象の下辺中央', () => {
    expect(undoChipRequestOf(RECT, '配置しました', null, null).anchor).toEqual({ x: 30, y: 50 })
  })

  it('文言・残像フレーム・強調対象はそのまま運ぶ', () => {
    const frame = { x: 1, y: 2, w: 3, h: 4 }
    const recent = { kind: 'furniture' as const, rect: RECT }
    expect(undoChipRequestOf(RECT, '削除しました', frame, recent)).toEqual({
      anchor: { x: 30, y: 50 },
      message: '削除しました',
      frame,
      recent,
    })
  })

  it('残像フレームと強調対象が無いときは null のまま渡す', () => {
    expect(undoChipRequestOf(RECT, '移動しました', null, null)).toEqual({
      anchor: { x: 30, y: 50 },
      message: '移動しました',
      frame: null,
      recent: null,
    })
  })
})
