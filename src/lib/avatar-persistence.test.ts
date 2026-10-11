// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  PartsAvatarConfig,
  PixelAvatarConfig,
  PixelsAvatarConfig,
  StoredAvatarRecord,
} from '@/types'
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

// kind を持たない旧形式。parts と同じ欄を持っていても kind が無ければ弾く
const { kind: _kind, ...partsWithoutKind } = partsConfig

const makeRecord = (
  ownerCode: string,
  config: StoredAvatarRecord['config']
): StoredAvatarRecord => ({
  ownerCode,
  ownerName: '山田太郎',
  config,
  updatedTime: '2026-08-16T00:00:00.000Z',
})

// 型を破った生データを、型付きの makeRecord を経由せず直接 JSON で書く
const writeRawRecord = (ownerCode: string, record: object | null): void => {
  window.localStorage.setItem(keyOf(ownerCode), JSON.stringify(record))
}

describe('avatar-persistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
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

    it('保存先は v2 接頭辞に ownerCode を続けたキーで、値はレコードの JSON', () => {
      const record = makeRecord('0001', presetConfig)
      saveStoredAvatar(record)

      expect(window.localStorage.getItem(keyOf('0001'))).toBe(JSON.stringify(record))
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

    it('接頭辞の外のキーは、値が今の形でもloadStoredAvatarsが拾わない', () => {
      window.localStorage.setItem(
        `${OLD_AVATAR_KEY_PREFIX}0001`,
        JSON.stringify(makeRecord('0001', presetConfig))
      )
      saveStoredAvatar(makeRecord('0002', presetConfig))

      expect(loadStoredAvatars().map(record => record.ownerCode)).toEqual(['0002'])
    })

    it('新接頭辞キーでもkindを持たない旧形式の値は型ガードで弾かれnullになる', () => {
      const oldShapeUnderNewKey = {
        ownerCode: '0001',
        ownerName: '山田太郎',
        config: { id: 'av1' },
        updatedTime: 'x',
      }
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
        config: {
          kind: 'pixels',
          size: 8,
          palette: { a: '#ffffff' },
          rows: Array<string>(8).fill('a'.repeat(8)),
        },
        updatedTime: 'x',
      }
      window.localStorage.setItem(keyOf('0001'), JSON.stringify(brokenRecord))

      expect(loadStoredAvatar('0001')).toBeNull()
    })

    it.each([
      ['preset で id が文字列でない', { kind: 'preset', id: 1 }],
      ['pixels で rows が配列でない', { ...pixelsConfig, rows: 'a' }],
      ['pixels で palette がオブジェクトでない', { ...pixelsConfig, palette: 'a' }],
      ['parts で face が文字列でない', { ...partsConfig, face: 1 }],
      ['parts で outfit が文字列でない', { ...partsConfig, outfit: 1 }],
      [
        'parts で palette.hair が文字列でない',
        { ...partsConfig, palette: { ...partsConfig.palette, hair: 1 } },
      ],
      [
        'parts で palette.skin が文字列でない',
        { ...partsConfig, palette: { ...partsConfig.palette, skin: 1 } },
      ],
      [
        'parts で palette.outfit が文字列でない',
        { ...partsConfig, palette: { ...partsConfig.palette, outfit: 1 } },
      ],
      ['parts で palette が null', { ...partsConfig, palette: null }],
      ['kind が無い(parts と同じ欄を持つ旧形式)', partsWithoutKind],
      ['config が文字列', 'av1'],
    ])('%s 設定はnullを返す', (_label, config) => {
      writeRawRecord('0001', { ...makeRecord('0001', presetConfig), config })

      expect(loadStoredAvatar('0001')).toBeNull()
    })

    it.each([
      ['ownerCode が文字列でない', { ...makeRecord('0001', presetConfig), ownerCode: 1 }],
      ['updatedTime が無い', { ownerCode: '0001', ownerName: '山田太郎', config: presetConfig }],
      ['config が無い', { ownerCode: '0001', ownerName: '山田太郎', updatedTime: 'x' }],
      ['値が JSON の null', null],
    ])('レコードの%s場合はnullを返す', (_label, record) => {
      writeRawRecord('0001', record)

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
      const spy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      expect(() => saveStoredAvatar(makeRecord('0001', presetConfig))).not.toThrow()
      expect(loadStoredAvatar('0001')).toBeNull()

      spy.mockRestore()
    })
  })

  describe('window の無い環境(SSR)', () => {
    it('読み込みは null・空配列を返し、保存は例外を投げない', () => {
      vi.stubGlobal('window', undefined)

      expect(loadStoredAvatar('0001')).toBeNull()
      expect(loadStoredAvatars()).toEqual([])
      expect(() => saveStoredAvatar(makeRecord('0001', presetConfig))).not.toThrow()
    })
  })
})
