// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_FLOOR_ID } from '@/utils/floors'
import type { Facility, Furniture, LayoutMeta, Seat, SeatLayout, Team } from '@/types'
import {
  clearStoredLayout,
  deleteCustomLayout,
  loadCustomLayout,
  loadDefaultLayoutId,
  loadLayoutMetas,
  loadStoredLayout,
  saveCustomLayout,
  saveDefaultLayoutId,
  saveLayoutMetas,
  saveStoredLayout,
} from '@/lib/layout-persistence'

// lib/layout-persistence.ts はキー定数を export していないため、旧スキーマ残存データを
// 実際のキーへ書き込んで検証するには文字列を複製する必要がある(意図的な重複)
const LAYOUT_STORAGE_KEY = 'seatmap-demo/layout'
const LAYOUT_METAS_KEY = 'seatmap-demo/layouts'
const DEFAULT_LAYOUT_ID_KEY = 'seatmap-demo/default-layout'
const customLayoutKey = (layoutId: string): string => `${LAYOUT_STORAGE_KEY}:${layoutId}`

const seat1: Seat = {
  id: 'seat-001',
  teamId: 'team-a',
  x: 0,
  y: 0,
  width: 105,
  height: 75,
  rotation: 0,
  employeeId: 'emp-1',
  shape: 'standard',
  isPending: false,
  origin: 'manual',
  isSizeOverridden: false,
}

const team1: Team = {
  id: 'team-a',
  idPrefix: 'A',
  name: 'チームA',
  color: '#336699',
  area: { x: 0, y: 0, w: 300, h: 300 },
  locked: false,
  freeAddressEnabled: false,
  autoFillEnabled: false,
}

const facility1: Facility = {
  id: 'fac-1',
  name: '会議室1',
  kind: 'meeting',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  locked: false,
  labelVisible: true,
}

const furniture1: Furniture = {
  id: 'furn-1',
  kind: 'table',
  name: '',
  x: 10,
  y: 10,
  width: 50,
  height: 50,
  rotation: 0,
  labelVisible: true,
  locked: false,
}

const makeLayout = (floorId: string): SeatLayout => ({
  floorId,
  floorName: '本社1F',
  viewBox: { width: 1000, height: 800 },
  seats: [seat1],
  teams: [team1],
  facilities: [facility1],
  furniture: [furniture1],
})

describe('layout-persistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  describe('空状態', () => {
    it('loadStoredLayout はキー未設定時 null を返す', () => {
      expect(loadStoredLayout(DEFAULT_FLOOR_ID, new Set())).toBeNull()
    })

    it('loadCustomLayout はキー未設定時 null を返す', () => {
      expect(loadCustomLayout('custom-1', new Set())).toBeNull()
    })

    it('loadLayoutMetas はキー未設定時 空配列を返す', () => {
      expect(loadLayoutMetas()).toEqual([])
    })

    it('loadDefaultLayoutId はキー未設定時 null を返す', () => {
      expect(loadDefaultLayoutId()).toBeNull()
    })
  })

  describe('旧スキーマ残存データの読み込み(回帰テスト)', () => {
    // schemaVersion・updatedTime・furniture配列・各種増設フィールドを一切持たない、
    // STEP追加前の保存分を模した生データ。実際に localStorage へ書き込んでから
    // 新コードで読み直し、無効化(既定値埋め・宙ぶらりん参照の解消)が効くことを確認する
    const oldRawLayout = {
      floorId: 'floor-1',
      floorName: '本社1F',
      viewBox: { width: 1000, height: 800 },
      seats: [
        { id: 'seat-001', teamId: 'team-a', x: 0, y: 0, width: 105, height: 75, rotation: 0, employeeId: 'emp-1' },
        { id: 'seat-002', teamId: 'team-a', x: 100, y: 0, width: 105, height: 75, rotation: 0, employeeId: 'emp-ghost' },
      ],
      teams: [
        { id: 'team-a', idPrefix: 'A', name: 'チームA', color: '#336699', area: { x: 0, y: 0, w: 300, h: 300 } },
      ],
      facilities: [
        { id: 'fac-1', name: '会議室1', kind: 'meeting', x: 0, y: 0, width: 100, height: 100 },
      ],
      // furniture フィールド自体が存在しない(furniture 追加以前の保存分)
    }

    it('公式レイアウト: 既定値が穴埋めされ、schemaVersion/updatedTimeが打たれる', () => {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(oldRawLayout))

      const result = loadStoredLayout(DEFAULT_FLOOR_ID, new Set(['emp-1']))

      expect(result).not.toBeNull()
      expect(result?.schemaVersion).toBe(1)
      expect(result?.updatedTime).toBe(new Date(0).toISOString())
      expect(result?.furniture).toEqual([])
      expect(result?.teams[0]).toMatchObject({
        locked: false,
        freeAddressEnabled: false,
        autoFillEnabled: false,
      })
      expect(result?.facilities[0]).toMatchObject({ locked: false, labelVisible: true })
      expect(result?.seats[0]).toMatchObject({
        shape: 'standard',
        isPending: false,
        origin: 'manual',
        isSizeOverridden: false,
      })
    })

    it('実在しない社員を指す座席のemployeeIdはnullへ戻され、座席自体は残る', () => {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(oldRawLayout))

      const result = loadStoredLayout(DEFAULT_FLOOR_ID, new Set(['emp-1']))

      expect(result?.seats).toHaveLength(2)
      expect(result?.seats[0].employeeId).toBe('emp-1')
      expect(result?.seats[1].id).toBe('seat-002')
      expect(result?.seats[1].employeeId).toBeNull()
    })

    it('カスタムレイアウトも同じ移行ロジックを通る', () => {
      window.localStorage.setItem(customLayoutKey('custom-1'), JSON.stringify(oldRawLayout))

      const result = loadCustomLayout('custom-1', new Set(['emp-1']))

      expect(result?.schemaVersion).toBe(1)
      expect(result?.furniture).toEqual([])
      expect(result?.seats[1].employeeId).toBeNull()
    })

    it('配列でない壊れたseatsフィールドは写さずそのまま通す(クラッシュしない)', () => {
      const brokenLayout = { ...oldRawLayout, seats: 'not-an-array' }
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(brokenLayout))

      const result = loadStoredLayout(DEFAULT_FLOOR_ID, new Set())

      expect(result).not.toBeNull()
      expect(result?.seats).toBe('not-an-array')
    })
  })

  describe('未来バージョンの保存分は読まずに温存する', () => {
    it('schemaVersionが現行より大きい場合はnullを返し、キーは消さない', () => {
      const futureLayout = { ...makeLayout(DEFAULT_FLOOR_ID), schemaVersion: 999, updatedTime: 'x' }
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(futureLayout))

      const result = loadStoredLayout(DEFAULT_FLOOR_ID, new Set())

      expect(result).toBeNull()
      expect(window.localStorage.getItem(LAYOUT_STORAGE_KEY)).toBe(JSON.stringify(futureLayout))
    })
  })

  describe('破損JSON', () => {
    it('loadStoredLayout: パース不能な生データはnullを返しキーを削除する', () => {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, '{not valid json')

      const result = loadStoredLayout(DEFAULT_FLOOR_ID, new Set())

      expect(result).toBeNull()
      expect(window.localStorage.getItem(LAYOUT_STORAGE_KEY)).toBeNull()
    })

    it('loadCustomLayout: パース不能な生データはnullを返しキーを削除する', () => {
      window.localStorage.setItem(customLayoutKey('custom-1'), '{not valid json')

      const result = loadCustomLayout('custom-1', new Set())

      expect(result).toBeNull()
      expect(window.localStorage.getItem(customLayoutKey('custom-1'))).toBeNull()
    })

    it('loadLayoutMetas: 配列でない値はnullではなく空配列を返しキーを削除する', () => {
      window.localStorage.setItem(LAYOUT_METAS_KEY, JSON.stringify({ notAnArray: true }))

      const result = loadLayoutMetas()

      expect(result).toEqual([])
      expect(window.localStorage.getItem(LAYOUT_METAS_KEY)).toBeNull()
    })
  })

  describe('保存 → 読み込みの往復', () => {
    it('saveStoredLayout はschemaVersion/updatedTimeを打ってから保存する', () => {
      saveStoredLayout(DEFAULT_FLOOR_ID, makeLayout(DEFAULT_FLOOR_ID))

      const result = loadStoredLayout(DEFAULT_FLOOR_ID, new Set(['emp-1']))

      expect(result?.schemaVersion).toBe(1)
      expect(result?.updatedTime).not.toBe(new Date(0).toISOString())
      expect(() => new Date(result?.updatedTime ?? '').toISOString()).not.toThrow()
      expect(result?.seats).toEqual([seat1])
    })

    it('floorId=floor-1(既定フロア)は従来キーをそのまま使う', () => {
      saveStoredLayout(DEFAULT_FLOOR_ID, makeLayout(DEFAULT_FLOOR_ID))

      expect(window.localStorage.getItem(LAYOUT_STORAGE_KEY)).not.toBeNull()
    })

    it('floorId=floor-2は末尾に付いた別キーに保存され、floor-1とは独立する', () => {
      saveStoredLayout('floor-2', makeLayout('floor-2'))

      expect(window.localStorage.getItem(`${LAYOUT_STORAGE_KEY}/floor-2`)).not.toBeNull()
      expect(window.localStorage.getItem(LAYOUT_STORAGE_KEY)).toBeNull()
      expect(loadStoredLayout(DEFAULT_FLOOR_ID, new Set())).toBeNull()
      expect(loadStoredLayout('floor-2', new Set(['emp-1']))?.floorId).toBe('floor-2')
    })

    it('saveCustomLayout → loadCustomLayout の往復', () => {
      saveCustomLayout('custom-1', makeLayout(DEFAULT_FLOOR_ID))

      const result = loadCustomLayout('custom-1', new Set(['emp-1']))

      expect(result?.schemaVersion).toBe(1)
      expect(result?.seats).toEqual([seat1])
    })

    it('clearStoredLayout は保存分を削除し読み込みはnullへ戻る', () => {
      saveStoredLayout(DEFAULT_FLOOR_ID, makeLayout(DEFAULT_FLOOR_ID))
      clearStoredLayout(DEFAULT_FLOOR_ID)

      expect(loadStoredLayout(DEFAULT_FLOOR_ID, new Set())).toBeNull()
    })
  })

  describe('quota超過(setItemがthrow)', () => {
    it('saveStoredLayout: setItemがthrowするとそのまま呼び出し元へ伝播する(キャッチしない実装)', () => {
      const spy = vi
        .spyOn(window.localStorage, 'setItem')
        .mockImplementation(() => {
          throw new Error('QuotaExceededError')
        })

      expect(() => saveStoredLayout(DEFAULT_FLOOR_ID, makeLayout(DEFAULT_FLOOR_ID))).toThrow(
        'QuotaExceededError'
      )

      spy.mockRestore()
    })

    it('saveCustomLayout: setItemがthrowするとそのまま呼び出し元へ伝播する', () => {
      const spy = vi
        .spyOn(window.localStorage, 'setItem')
        .mockImplementation(() => {
          throw new Error('QuotaExceededError')
        })

      expect(() => saveCustomLayout('custom-1', makeLayout(DEFAULT_FLOOR_ID))).toThrow(
        'QuotaExceededError'
      )

      spy.mockRestore()
    })

    it('saveLayoutMetas: setItemがthrowするとそのまま呼び出し元へ伝播する', () => {
      const spy = vi
        .spyOn(window.localStorage, 'setItem')
        .mockImplementation(() => {
          throw new Error('QuotaExceededError')
        })

      expect(() => saveLayoutMetas([{ layoutId: 'custom-1', layoutName: 'A', updatedAt: 'x' }])).toThrow(
        'QuotaExceededError'
      )

      spy.mockRestore()
    })

    it('saveDefaultLayoutId: setItemがthrowするとそのまま呼び出し元へ伝播する', () => {
      const spy = vi
        .spyOn(window.localStorage, 'setItem')
        .mockImplementation(() => {
          throw new Error('QuotaExceededError')
        })

      expect(() => saveDefaultLayoutId('custom-1')).toThrow('QuotaExceededError')

      spy.mockRestore()
    })
  })

  describe('カスタムレイアウトの削除', () => {
    it('deleteCustomLayout はペイロードとメタ一覧の両方から消す(孤児を残さない)', () => {
      saveCustomLayout('custom-1', makeLayout(DEFAULT_FLOOR_ID))
      saveCustomLayout('custom-2', makeLayout(DEFAULT_FLOOR_ID))
      const metas: LayoutMeta[] = [
        { layoutId: 'custom-1', layoutName: 'レイアウトA', updatedAt: '2026-01-01T00:00:00.000Z' },
        { layoutId: 'custom-2', layoutName: 'レイアウトB', updatedAt: '2026-01-02T00:00:00.000Z' },
      ]
      saveLayoutMetas(metas)

      deleteCustomLayout('custom-1')

      expect(window.localStorage.getItem(customLayoutKey('custom-1'))).toBeNull()
      expect(loadCustomLayout('custom-1', new Set())).toBeNull()
      expect(loadLayoutMetas()).toEqual([metas[1]])
    })
  })

  describe('起動時に開くレイアウトid', () => {
    it('保存・読み込みの往復', () => {
      saveDefaultLayoutId('custom-1')

      expect(loadDefaultLayoutId()).toBe('custom-1')
    })

    it('nullを渡すとキーを削除して既定へ戻す', () => {
      saveDefaultLayoutId('custom-1')
      saveDefaultLayoutId(null)

      expect(loadDefaultLayoutId()).toBeNull()
      expect(window.localStorage.getItem(DEFAULT_LAYOUT_ID_KEY)).toBeNull()
    })
  })
})
