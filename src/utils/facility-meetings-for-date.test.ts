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
  {
    id: 'fm-seed-2',
    facilityId: 'fac-a',
    title: '定例会議',
    startMin: 600,
    endMin: 660,
    organizerId: 'e1',
    participantIds: ['e1', 'e2'],
  },
  {
    id: 'fm-seed-1',
    facilityId: 'fac-a',
    title: '1on1',
    startMin: 540,
    endMin: 570,
    organizerId: 'e3',
    participantIds: ['e3', 'e4'],
  },
  {
    id: 'fm-seed-3',
    facilityId: 'fac-b',
    title: '採用面接',
    startMin: 700,
    endMin: 760,
    organizerId: 'e5',
    participantIds: ['e5'],
  },
]

const employeePool = Array.from({ length: 10 }, (_, i) => `e${i + 1}`)

// 1件を「id facilityId 開始-終了 件名 主催者 参加者」の1行にして、日付ごとの結果を表で突き合わせる
const summarize = (m: FacilityMeeting): string =>
  `${m.id} ${m.facilityId} ${m.startMin}-${m.endMin} ${m.title} ${m.organizerId} ${m.participantIds.join(',')}`

// 2026年の毎日(YYYY-MM-DD)
const dateKeysOf2026 = (): string[] => {
  const keys: string[] = []
  for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2027, 0, 1); t += 86400000) {
    keys.push(new Date(t).toISOString().slice(0, 10))
  }
  return keys
}

const isWeekendKey = (dateKey: string): boolean => {
  const weekday = weekdayOfDateKey(dateKey)
  return weekday === 0 || weekday === 6
}

// 2026年の毎日について fac-a の生成結果を並べる
const generatedIn2026 = (): { dateKey: string; meetings: FacilityMeeting[] }[] =>
  dateKeysOf2026().map(dateKey => ({
    dateKey,
    meetings: meetingsForDate(seed, 'fac-a', dateKey, '2000-01-01', employeePool),
  }))

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
    const ids = result.map(m => m.id)
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

describe('meetingsForDate の日付ごとの生成結果', () => {
  // 同じ日付・会議室なら、いつ開いても同じ予約が並ぶ。その中身を日付ごとに固定する
  it('平日(2026-07-14 火)は生成順と逆の4件を開始時刻順に並べて返す', () => {
    const result = meetingsForDate(seed, 'fac-a', '2026-07-14', '2026-06-15', employeePool)
    expect(result.map(summarize)).toEqual([
      'fm-2026-07-14-fac-a-3 fac-a 570-660 部門ミーティング e1 e1,e3,e6,e9,e10,e5,e8',
      'fm-2026-07-14-fac-a-2 fac-a 660-690 採用面接 e1 e1,e10,e5,e2',
      'fm-2026-07-14-fac-a-1 fac-a 720-780 研修 e7 e7,e2,e3,e9,e6,e8',
      'fm-2026-07-14-fac-a-0 fac-a 900-960 研修 e1 e1,e8,e10,e5,e6,e4',
    ])
  })

  it('平日(2026-07-29 水)は17:30ちょうどに終わる会議も置ける', () => {
    const result = meetingsForDate(seed, 'fac-a', '2026-07-29', '2026-06-15', employeePool)
    expect(result.map(summarize)).toEqual([
      'fm-2026-07-29-fac-a-1 fac-a 570-600 採用面接 e6 e6,e10,e8,e9,e5',
      'fm-2026-07-29-fac-a-2 fac-a 840-870 定例会議 e9 e9,e3,e7,e2',
      'fm-2026-07-29-fac-a-0 fac-a 960-1050 採用面接 e9 e9,e3,e5,e7,e2',
    ])
  })

  it('土曜(2026-07-04)と日曜(2026-07-19)はそれぞれ1件', () => {
    const saturday = meetingsForDate(seed, 'fac-a', '2026-07-04', '2026-06-15', employeePool)
    const sunday = meetingsForDate(seed, 'fac-a', '2026-07-19', '2026-06-15', employeePool)
    expect(saturday.map(summarize)).toEqual([
      'fm-2026-07-04-fac-a-0 fac-a 810-840 採用面接 e8 e8,e6,e1,e9,e2,e4,e3',
    ])
    expect(sunday.map(summarize)).toEqual([
      'fm-2026-07-19-fac-a-0 fac-a 630-720 部門ミーティング e6 e6,e8,e5,e10,e1,e4',
    ])
  })

  it('90分の会議3件で残りの空きが60分ずつになったら、件数の途中でも置くのをやめる', () => {
    const result = meetingsForDate(seed, 'room-a', '2038-12-17', '2026-06-15', employeePool)
    expect(result.map(summarize)).toEqual([
      'fm-2038-12-17-room-a-1 room-a 600-690 打ち合わせ e7 e7,e5,e10,e9,e2,e6,e8',
      'fm-2038-12-17-room-a-2 room-a 750-840 採用面接 e8 e8,e6,e5,e4',
      'fm-2038-12-17-room-a-0 room-a 900-990 部門ミーティング e2 e2,e3,e5',
    ])
  })

  it('社員が参加者の人数より少なければ、居る社員だけで参加者を埋める', () => {
    const result = meetingsForDate(seed, 'fac-a', '2026-07-14', '2026-06-15', ['e1', 'e2', 'e3'])
    expect(result.map(summarize)).toEqual([
      'fm-2026-07-14-fac-a-1 fac-a 600-660 打ち合わせ e2 e2,e3,e1',
      'fm-2026-07-14-fac-a-3 fac-a 660-690 打ち合わせ e2 e2,e3,e1',
      'fm-2026-07-14-fac-a-2 fac-a 810-870 1on1 e2 e2,e1,e3',
      'fm-2026-07-14-fac-a-0 fac-a 900-960 研修 e3 e3,e1,e2',
    ])
  })

  it('社員が居なければ、予約が入る日付でも空配列を返す', () => {
    expect(meetingsForDate(seed, 'fac-a', '2026-07-14', '2026-06-15', [])).toEqual([])
  })
})

describe('meetingsForDate の1年分の生成結果', () => {
  it('件数は平日0〜4件・週末0〜1件で、どちらも上限の件数に届く日がある', () => {
    const counts = (wantWeekend: boolean): Set<number> =>
      new Set(
        generatedIn2026()
          .filter(({ dateKey }) => isWeekendKey(dateKey) === wantWeekend)
          .map(({ meetings }) => meetings.length)
      )
    expect([...counts(false)].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4])
    expect([...counts(true)].sort((a, b) => a - b)).toEqual([0, 1])
  })

  it('件名は7種の候補から選ばれ、7種すべてが現れる', () => {
    const titles = new Set(generatedIn2026().flatMap(({ meetings }) => meetings.map(m => m.title)))
    expect([...titles].sort()).toEqual(
      [
        '定例会議',
        'プロジェクト進捗',
        '1on1',
        '部門ミーティング',
        '打ち合わせ',
        '研修',
        '採用面接',
      ].sort()
    )
  })

  it('長さは30・60・90分のどれかで、3種すべてが現れる', () => {
    const durations = new Set(
      generatedIn2026().flatMap(({ meetings }) => meetings.map(m => m.endMin - m.startMin))
    )
    expect([...durations].sort((a, b) => a - b)).toEqual([30, 60, 90])
  })

  it('参加者は主催者を含めて3〜7名で、両端の人数も現れる', () => {
    const sizes = new Set(
      generatedIn2026().flatMap(({ meetings }) => meetings.map(m => m.participantIds.length))
    )
    expect([...sizes].sort((a, b) => a - b)).toEqual([3, 4, 5, 6, 7])
  })

  it('開始は09:00〜17:00の30分刻みで、同じ日の会議どうしは重ならない', () => {
    for (const { meetings } of generatedIn2026()) {
      for (const m of meetings) {
        expect((m.startMin - GRID_START_MIN) % 30).toBe(0)
        expect(m.startMin).toBeGreaterThanOrEqual(GRID_START_MIN)
        expect(m.endMin).toBeLessThanOrEqual(GRID_END_MIN)
      }
      for (let i = 0; i < meetings.length - 1; i += 1) {
        expect(meetings[i].endMin).toBeLessThanOrEqual(meetings[i + 1].startMin)
      }
    }
  })
})
