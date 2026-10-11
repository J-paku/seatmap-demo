import { describe, it, expect } from 'vitest'
import { meetingsForDate } from './facility-meetings-for-date'
import type { FacilityMeeting } from '@/types'

// グリッド境界(GRID_START_MIN=540, GRID_END_MIN=1050)を実装から独立して再掲する
// (テスト側の期待値算出専用であり、実装の再実装ではない)
const GRID_START_MIN = 9 * 60
const GRID_END_MIN = 17 * 60 + 30

// dateKey(YYYY-MM-DD)の曜日をDate.UTCのみで独立に判定する
const weekdayOfDateKey = (dateKey: string): number => {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

// 指定の年月の中から、週末/平日いずれかに該当する最初の日付キーを実測して探す
// (特定の日付の曜日を推測せず、その場でDateに聞いて確定させる)
const findDateKeyByWeekendness = (y: number, m: number, wantWeekend: boolean): string => {
  for (let d = 1; d <= 28; d += 1) {
    const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const weekday = weekdayOfDateKey(key)
    const isWeekend = weekday === 0 || weekday === 6
    if (isWeekend === wantWeekend) return key
  }
  throw new Error('候補日が見つからなかった')
}

const seed: FacilityMeeting[] = [
  { id: 'fm-seed-2', facilityId: 'fac-a', title: '定例会議', startMin: 600, endMin: 660, organizerId: 'e1', participantIds: ['e1', 'e2'] },
  { id: 'fm-seed-1', facilityId: 'fac-a', title: '1on1', startMin: 540, endMin: 570, organizerId: 'e3', participantIds: ['e3', 'e4'] },
  { id: 'fm-seed-3', facilityId: 'fac-b', title: '採用面接', startMin: 700, endMin: 760, organizerId: 'e5', participantIds: ['e5'] },
]

const employeePool = Array.from({ length: 10 }, (_, i) => `e${i + 1}`)

describe('meetingsForDate', () => {
  it('dateKeyがtodayKeyと一致する時は種データをfacilityIdで絞り込みstartMin昇順で返す', () => {
    const result = meetingsForDate(seed, 'fac-a', '2026-06-15', '2026-06-15', [])
    expect(result).toEqual([seed[1], seed[0]])
  })

  it('todayKey一致時はemployeeIdsが空でも種データを返す(早期return)', () => {
    const result = meetingsForDate(seed, 'fac-a', '2026-06-15', '2026-06-15', [])
    expect(result.length).toBe(2)
  })

  it('todayKey不一致でemployeeIdsが空なら空配列を返す', () => {
    const result = meetingsForDate(seed, 'fac-a', '2026-07-01', '2026-06-15', [])
    expect(result).toEqual([])
  })

  it('同一引数なら決定論的に同じ結果を返す(Date.now/Math.randomを使わない)', () => {
    const a = meetingsForDate(seed, 'fac-a', '2026-07-01', '2026-06-15', employeePool)
    const b = meetingsForDate(seed, 'fac-a', '2026-07-01', '2026-06-15', employeePool)
    expect(a).toEqual(b)
  })

  it('生成された会議はグリッド範囲内・重複なし・startMin昇順', () => {
    const dateKey = findDateKeyByWeekendness(2026, 7, false)
    const result = meetingsForDate(seed, 'fac-a', dateKey, '2026-06-15', employeePool)
    for (const m of result) {
      expect(m.startMin).toBeGreaterThanOrEqual(GRID_START_MIN)
      expect(m.endMin).toBeLessThanOrEqual(GRID_END_MIN)
      expect(m.startMin).toBeLessThan(m.endMin)
    }
    for (let i = 0; i < result.length - 1; i += 1) {
      expect(result[i].startMin).toBeLessThanOrEqual(result[i + 1].startMin)
      expect(result[i].endMin).toBeLessThanOrEqual(result[i + 1].startMin)
    }
  })

  it('平日は最大4件までしか生成しない', () => {
    const dateKey = findDateKeyByWeekendness(2026, 7, false)
    const result = meetingsForDate(seed, 'fac-a', dateKey, '2026-06-15', employeePool)
    expect(result.length).toBeLessThanOrEqual(4)
  })

  it('週末は最大1件までしか生成しない', () => {
    const dateKey = findDateKeyByWeekendness(2026, 7, true)
    const result = meetingsForDate(seed, 'fac-a', dateKey, '2026-06-15', employeePool)
    expect(result.length).toBeLessThanOrEqual(1)
  })

  it('生成された会議の主催者・参加者はemployeeIdsから重複なく選ばれる', () => {
    const dateKey = findDateKeyByWeekendness(2026, 7, false)
    const result = meetingsForDate(seed, 'fac-a', dateKey, '2026-06-15', employeePool)
    for (const m of result) {
      expect(employeePool).toContain(m.organizerId)
      expect(m.participantIds[0]).toBe(m.organizerId)
      const unique = new Set(m.participantIds)
      expect(unique.size).toBe(m.participantIds.length)
      for (const id of m.participantIds) expect(employeePool).toContain(id)
    }
  })

  it('生成された会議のidは`fm-${dateKey}-${facilityId}-${生成順index}`の形式で一意', () => {
    // idの末尾indexは生成順(ループのi)であり、返り値はstartMin昇順にソート済みなので
    // 最終的な配列位置とは一致しない場合がある。ここでは形式と一意性のみ検証する
    const dateKey = findDateKeyByWeekendness(2026, 7, false)
    const result = meetingsForDate(seed, 'fac-a', dateKey, '2026-06-15', employeePool)
    const ids = result.map((m) => m.id)
    for (const id of ids) expect(id).toMatch(new RegExp(`^fm-${dateKey}-fac-a-\\d+$`))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('facilityIdが異なれば別々の乱数種となり、生成結果のidも別facilityId扱いになる', () => {
    const dateKey = findDateKeyByWeekendness(2026, 7, false)
    const resultA = meetingsForDate(seed, 'fac-a', dateKey, '2026-06-15', employeePool)
    const resultB = meetingsForDate(seed, 'fac-b', dateKey, '2026-06-15', employeePool)
    for (const m of resultA) expect(m.facilityId).toBe('fac-a')
    for (const m of resultB) expect(m.facilityId).toBe('fac-b')
  })
})
