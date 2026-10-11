// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PartsAvatarConfig, PixelAvatarConfig, PixelsAvatarConfig, StoredAvatarRecord } from '@/types'
import { loadStoredAvatar, loadStoredAvatars, saveStoredAvatar } from '@/lib/avatar-persistence'

// lib/avatar-persistence.ts はキー接頭辞を export していないため、旧接頭辞の残存データを
// 実際のキー空間へ書き込んで検証するには文字列を複製する必要がある(意図的な重複)
const AVATAR_KEY_PREFIX = 'seatmap-demo:avatar-v2:'
// v2 移行前に使われていたと想定する旧接頭辞(kindを持たないAvatarConfigの時代)
const OLD_AVATAR_KEY_PREFIX = 'seatmap-demo:avatar:'
const keyOf = (ownerCode: string): string => `${AVATAR_KEY_PREFIX}${ownerCode}`

// PresetAvatarConfig は @/types から export されていないため、上位の union 型で受ける
const presetConfig: PixelAvatarConfig = { kind: 'preset', id: 'av1' }

const partsConfig: PartsAvatarConfig = {
  kind: 'parts',
  hair: 'short',
  face: 'smile',
  outfit: 'suit',
  palette: { hair: '#000000', skin: '#ffcc99', outfit: '#123456', outfitDark: '#001122' },
}

const pixelsConfig: PixelsAvatarConfig = {
  kind: 'pixels',
  size: 16,
  palette: { a: '#ffffff' },
  rows: Array<string>(16).fill('a'.repeat(16)),
}

const makeRecord = (ownerCode: string, config: StoredAvatarRecord['config']): StoredAvatarRecord => ({
  ownerCode,
  ownerName: '山田太郎',
  config,
  updatedTime: '2026-08-16T00:00:00.000Z',
})

describe('avatar-persistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  describe('空状態', () => {
    it('loadStoredAvatar はキー未設定時 null を返す', () => {
      expect(loadStoredAvatar('0001')).toBeNull()
    })

    it('loadStoredAvatars はエントリ無しなら空配列を返す', () => {
      expect(loadStoredAvatars()).toEqual([])
    })
  })

  describe('PixelAvatarConfigの3種を保存・読込できる', () => {
    it('preset', () => {
      saveStoredAvatar(makeRecord('0001', presetConfig))
      expect(loadStoredAvatar('0001')?.config).toEqual(presetConfig)
    })

    it('parts', () => {
      saveStoredAvatar(makeRecord('0002', partsConfig))
      expect(loadStoredAvatar('0002')?.config).toEqual(partsConfig)
    })

    it('pixels', () => {
      saveStoredAvatar(makeRecord('0003', pixelsConfig))
      expect(loadStoredAvatar('0003')?.config).toEqual(pixelsConfig)
    })
  })

  describe('旧接頭辞キーの残存データは無効化される(接頭辞変更による回帰テスト)', () => {
    // コード先頭コメント通り: 旧スキーマ(kindを持たないAvatarConfig)が新接頭辞と
    // 同じキーに残っていると型ガードで弾くだけになるため、接頭辞ごと変えて旧値を参照しない設計。
    // 旧接頭辞のキーへ実際に書き込み、新コードがそれを一切拾わないことを確認する
    it('旧接頭辞に書かれたレコードはloadStoredAvatarで見えない(キーが違う)', () => {
      const oldShapeRecord = { ownerCode: '0001', ownerName: '山田太郎', config: { id: 'av1' } }
      window.localStorage.setItem(`${OLD_AVATAR_KEY_PREFIX}0001`, JSON.stringify(oldShapeRecord))

      expect(loadStoredAvatar('0001')).toBeNull()
    })

    it('旧接頭辞に書かれたレコードはloadStoredAvatarsの走査対象にも入らない', () => {
      const oldShapeRecord = { ownerCode: '0001', ownerName: '山田太郎', config: { id: 'av1' } }
      window.localStorage.setItem(`${OLD_AVATAR_KEY_PREFIX}0001`, JSON.stringify(oldShapeRecord))
      saveStoredAvatar(makeRecord('0002', presetConfig))

      const records = loadStoredAvatars()

      expect(records).toHaveLength(1)
      expect(records[0].ownerCode).toBe('0002')
    })

    it('新接頭辞キーでもkindを持たない旧形式の値は型ガードで弾かれnullになる', () => {
      const oldShapeUnderNewKey = { ownerCode: '0001', ownerName: '山田太郎', config: { id: 'av1' }, updatedTime: 'x' }
      window.localStorage.setItem(keyOf('0001'), JSON.stringify(oldShapeUnderNewKey))

      expect(loadStoredAvatar('0001')).toBeNull()
      // 型不一致でも自動削除はしない(実装に副作用が無いことの確認)
      expect(window.localStorage.getItem(keyOf('0001'))).not.toBeNull()
    })
  })

  describe('破損JSON・型不一致', () => {
    it('パース不能な生データはnullを返す', () => {
      window.localStorage.setItem(keyOf('0001'), '{not valid json')

      expect(loadStoredAvatar('0001')).toBeNull()
    })

    it('必須フィールド欠落(ownerName無し)はnullを返す', () => {
      window.localStorage.setItem(
        keyOf('0001'),
        JSON.stringify({ ownerCode: '0001', config: presetConfig, updatedTime: 'x' })
      )

      expect(loadStoredAvatar('0001')).toBeNull()
    })

    it('parts設定でhairが文字列でない場合はnullを返す', () => {
      // 意図的に型を破った生データ。makeRecord(型付き)を経由せず直接JSONへ書く
      const brokenRecord = {
        ownerCode: '0001',
        ownerName: '山田太郎',
        config: {
          kind: 'parts',
          hair: 123,
          face: 'smile',
          outfit: 'suit',
          palette: { hair: '#000000', skin: '#ffcc99', outfit: '#123456', outfitDark: '#001122' },
        },
        updatedTime: 'x',
      }
      window.localStorage.setItem(keyOf('0001'), JSON.stringify(brokenRecord))

      expect(loadStoredAvatar('0001')).toBeNull()
    })

    it('pixels設定でsizeが16以外なら無効', () => {
      const brokenRecord = {
        ownerCode: '0001',
        ownerName: '山田太郎',
        config: { kind: 'pixels', size: 8, palette: { a: '#ffffff' }, rows: Array<string>(8).fill('a'.repeat(8)) },
        updatedTime: 'x',
      }
      window.localStorage.setItem(keyOf('0001'), JSON.stringify(brokenRecord))

      expect(loadStoredAvatar('0001')).toBeNull()
    })

    it('loadStoredAvatars: 破損エントリは読み飛ばし正常なものだけ返す', () => {
      window.localStorage.setItem(keyOf('broken'), '{not valid json')
      saveStoredAvatar(makeRecord('ok', presetConfig))

      const records = loadStoredAvatars()

      expect(records).toHaveLength(1)
      expect(records[0].ownerCode).toBe('ok')
    })
  })

  describe('quota超過(setItemがthrow)', () => {
    it('saveStoredAvatar は書き込み失敗を握りつぶし例外を投げない', () => {
      const spy = vi
        .spyOn(window.localStorage, 'setItem')
        .mockImplementation(() => {
          throw new Error('QuotaExceededError')
        })

      expect(() => saveStoredAvatar(makeRecord('0001', presetConfig))).not.toThrow()
      expect(loadStoredAvatar('0001')).toBeNull()

      spy.mockRestore()
    })
  })
})
