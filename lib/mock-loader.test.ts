// @vitest-environment happy-dom
// mock-loader は readCache/writeCache/touchLayoutMetaUpdatedAt で window.localStorage に
// 実際に触れる(layout-persistence 経由)。node 環境では window が無く早期returnするだけの
// 分岐しか通らないため、happy-dom で実際の永続化挙動を検証する。
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'
import employeesJson from '../mocks/employees.json'
import avatarsJson from '../mocks/avatars.json'
import teamsJson from '../mocks/teams.json'
import seatsJson from '../mocks/seats.json'
import facilitiesJson from '../mocks/facilities.json'
import furnitureJson from '../mocks/furniture.json'
import teamsFloor2Json from '../mocks/floor-2/teams.json'
import seatsFloor2Json from '../mocks/floor-2/seats.json'
import facilitiesFloor2Json from '../mocks/floor-2/facilities.json'
import furnitureFloor2Json from '../mocks/floor-2/furniture.json'
import schedulesJson from '../mocks/schedules.json'
import facilityMeetingsJson from '../mocks/facility-meetings.json'
import { jstDateFromMs, jstDateKey } from '@/utils/jst-date'
import { hashString } from '@/utils/hash-string'
import { VIEWBOX_W, VIEWBOX_H } from '@/utils/layout/geometry'
import { loadLayoutMetas, saveLayoutMetas } from '@/lib/layout-persistence'
import type { ScheduleEvent } from '@/types'

// mock-loader.ts は import 直後(モジュール評価時)に anchorSchedulesToDate(..., Date.now())
// を実行して SCHEDULES を確定させる。読み込み前に「今日」を固定し、動的 import で評価タイミングを
// 制御しないと anchoring のテストが実行環境の実日付に依存してしまう
const FIXED_NOW = new Date('2026-08-16T12:00:00+09:00').getTime()

// 動的 import 前にモジュール型だけ宣言しておく(値は beforeAll で FIXED_NOW 固定後に代入する)
let mod: typeof import('./mock-loader')

beforeAll(async () => {
  vi.setSystemTime(FIXED_NOW)
  mod = await import('./mock-loader')
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('EMPLOYEES / ALL_TEAMS / ALL_FACILITIES / FACILITY_MEETINGS (単純パススルー)', () => {
  it('EMPLOYEES は employees.json をそのまま渡す', () => {
    expect(mod.EMPLOYEES).toEqual(employeesJson)
  })

  it('ALL_TEAMS は floor-1 → floor-2 の順で結合する(FLOORS の並び順どおり)', () => {
    expect(mod.ALL_TEAMS).toEqual([...teamsJson, ...teamsFloor2Json])
  })

  it('ALL_FACILITIES は floor-1 → floor-2 の順で結合する', () => {
    expect(mod.ALL_FACILITIES).toEqual([...facilitiesJson, ...facilitiesFloor2Json])
  })

  it('FACILITY_MEETINGS は facility-meetings.json をそのまま渡す', () => {
    expect(mod.FACILITY_MEETINGS).toEqual(facilityMeetingsJson)
  })
})

describe('seedAvatarRecords', () => {
  it('avatars.json と同じ件数を返し、config を保持する', () => {
    const records = mod.seedAvatarRecords()
    expect(records).toHaveLength(avatarsJson.length)
    records.forEach((record, i) => {
      expect(record.ownerCode).toBe(avatarsJson[i].ownerCode)
      expect(record.config).toEqual(avatarsJson[i].config)
    })
  })

  it('呼び出すたびに同じシード配列(参照)を返す', () => {
    expect(mod.seedAvatarRecords()).toBe(mod.seedAvatarRecords())
  })
})

describe('FLOOR_SEEDS', () => {
  it('floor-1: teams はそのまま、seats/facilities は件数と値を保つ', () => {
    const seed = mod.FLOOR_SEEDS['floor-1']
    expect(seed.teams).toEqual(teamsJson)
    expect(seed.seats).toHaveLength(seatsJson.length)
    expect(seed.seats).toEqual(seatsJson)
    expect(seed.facilities).toHaveLength(facilitiesJson.length)
    expect(seed.facilities).toEqual(facilitiesJson)
    expect(seed.furniture).toEqual(furnitureJson)
  })

  it('floor-2: 同様に件数と値を保つ', () => {
    const seed = mod.FLOOR_SEEDS['floor-2']
    expect(seed.teams).toEqual(teamsFloor2Json)
    expect(seed.seats).toEqual(seatsFloor2Json)
    expect(seed.facilities).toEqual(facilitiesFloor2Json)
    expect(seed.furniture).toEqual(furnitureFloor2Json)
  })

  it('登録フロアは FLOOR_SEEDS のキーと一致する(floor-1 / floor-2 の2件)', () => {
    expect(Object.keys(mod.FLOOR_SEEDS).sort()).toEqual(['floor-1', 'floor-2'])
  })
})

describe('VIEWBOX', () => {
  it('utils/layout/geometry の定数から生成される', () => {
    expect(mod.VIEWBOX).toEqual({ width: VIEWBOX_W, height: VIEWBOX_H })
  })
})

describe('SCHEDULES(日付アンカリング)', () => {
  const expectedDateKey = jstDateKey(jstDateFromMs(FIXED_NOW))

  it('件数は schedules.json と一致する', () => {
    expect(mod.SCHEDULES).toHaveLength(schedulesJson.length)
  })

  it('start/end の日付部分は固定した「今日」に揃い、時刻+オフセット部分は元データを保つ', () => {
    mod.SCHEDULES.forEach((event, i) => {
      const original = schedulesJson[i]
      expect(event.start.slice(0, 10)).toBe(expectedDateKey)
      expect(event.end.slice(0, 10)).toBe(expectedDateKey)
      expect(event.start.slice(10)).toBe(original.start.slice(10))
      expect(event.end.slice(10)).toBe(original.end.slice(10))
    })
  })

  it('start/end 以外のフィールドは変更しない', () => {
    mod.SCHEDULES.forEach((event, i) => {
      const original = schedulesJson[i] as ScheduleEvent
      const { start: _s, end: _e, ...restEvent } = event
      const { start: _os, end: _oe, ...restOriginal } = original
      expect(restEvent).toEqual(restOriginal)
    })
  })
})

describe('fingerprintOf', () => {
  it('同じ name + data では hashString(JSON.stringify(data)) と一致する', () => {
    const data = { a: 1, b: 'x' }
    expect(mod.fingerprintOf('fp-test-a', data)).toBe(hashString(JSON.stringify(data)))
  })

  it('同じ呼び出しは同じ値を返す(冪等)', () => {
    const data = { same: true }
    expect(mod.fingerprintOf('fp-test-b', data)).toBe(mod.fingerprintOf('fp-test-b', data))
  })

  it('name 単位でメモ化される — 2回目以降は data を変えても最初の指紋を返し続ける', () => {
    const first = mod.fingerprintOf('fp-test-memo', { v: 1 })
    const second = mod.fingerprintOf('fp-test-memo', { v: 2 })
    expect(second).toBe(first)
    expect(second).toBe(hashString(JSON.stringify({ v: 1 })))
  })
})

describe('readCache / writeCache', () => {
  it('write した内容を同じ fingerprint で read すると復元できる', () => {
    const data = { hello: 'world' }
    mod.writeCache('rc-a', data, 'fp-1')
    expect(mod.readCache('rc-a', 'fp-1')).toEqual(data)
  })

  it('fingerprint が一致しないとキャッシュミス扱い(undefined)になる', () => {
    mod.writeCache('rc-b', { v: 1 }, 'fp-old')
    expect(mod.readCache('rc-b', 'fp-new')).toBeUndefined()
  })

  it('キーが存在しない場合は undefined を返す', () => {
    expect(mod.readCache('rc-missing', 'fp-x')).toBeUndefined()
  })

  it('封筒(fingerprint/data)を実際に seatmap:: プレフィックス付きキーで保存する', () => {
    mod.writeCache('rc-c', { v: 2 }, 'fp-c')
    const raw = window.localStorage.getItem('seatmap::rc-c')
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw as string)).toEqual({ fingerprint: 'fp-c', data: { v: 2 } })
  })

  it('壊れたJSONが保存されていても例外を投げず undefined を返す', () => {
    window.localStorage.setItem('seatmap::rc-broken', '{not json')
    expect(mod.readCache('rc-broken', 'fp-x')).toBeUndefined()
  })

  it('封筒形式でない旧形式(配列そのまま)はキャッシュミス扱いになる', () => {
    window.localStorage.setItem('seatmap::rc-legacy', JSON.stringify([1, 2, 3]))
    expect(mod.readCache('rc-legacy', 'fp-x')).toBeUndefined()
  })

  it('localStorage.setItem が例外を投げても writeCache は例外を伝播しない(容量超過などを無視)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded')
    })
    expect(() => mod.writeCache('rc-quota', { v: 1 }, 'fp-1')).not.toThrow()
  })
})

describe('fetchWithRetry', () => {
  it('渡したデータをそのまま解決する(実装上 FORCE_FAIL は常に false)', async () => {
    const data = { foo: 'bar' }
    await expect(mod.fetchWithRetry(data)).resolves.toEqual(data)
  })

  it('即座には解決せず、遅延を挟んで解決する(setTimeout ベースの模擬遅延)', async () => {
    const start = performance.now()
    await mod.fetchWithRetry({ ok: true })
    const elapsed = performance.now() - start
    // responseDelay() は 200〜500ms。実行環境のスケジューリング揺らぎを見込み下限は緩める
    expect(elapsed).toBeGreaterThanOrEqual(150)
  })
})

describe('touchLayoutMetaUpdatedAt', () => {
  it('対象 layoutId の updatedAt だけを現在時刻(ISO)へ打ち直す', () => {
    saveLayoutMetas([
      { layoutId: 'L1', layoutName: 'Layout 1', updatedAt: '2020-01-01T00:00:00.000Z' },
      { layoutId: 'L2', layoutName: 'Layout 2', updatedAt: '2020-01-01T00:00:00.000Z' },
    ])

    mod.touchLayoutMetaUpdatedAt('L1')

    const metas = loadLayoutMetas()
    const l1 = metas.find((m) => m.layoutId === 'L1')
    const l2 = metas.find((m) => m.layoutId === 'L2')
    expect(l1?.updatedAt).toBe(new Date(FIXED_NOW).toISOString())
    expect(l2?.updatedAt).toBe('2020-01-01T00:00:00.000Z')
  })

  it('該当する layoutId が無ければ一覧はそのまま(件数・内容とも変化なし)', () => {
    const before = [
      { layoutId: 'L1', layoutName: 'Layout 1', updatedAt: '2020-01-01T00:00:00.000Z' },
    ]
    saveLayoutMetas(before)

    mod.touchLayoutMetaUpdatedAt('does-not-exist')

    expect(loadLayoutMetas()).toEqual(before)
  })
})
