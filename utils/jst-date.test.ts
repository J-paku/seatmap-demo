import { describe, it, expect } from 'vitest'
import {
  jstClockLabel,
  jstDateFromMs,
  jstDateKey,
  jstKeyFromIso,
  addJstDays,
  isSameJstDate,
  jstWeekday,
  buildMonthGrid,
} from './jst-date'
import type { JstDate } from './jst-date'

// JST = UTC+9, no DST. 独立参照実装として ms → JST暦日 を別経路で計算する
// (実装は Intl.DateTimeFormat を使うが、こちらは単純なオフセット加算)
const referenceJstDate = (ms: number): JstDate => {
  const shifted = new Date(ms + 9 * 60 * 60 * 1000)
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth() + 1, d: shifted.getUTCDate() }
}

// dateKeyの曜日を独立に計算する(parseDateKeyの再実装ではなく、標準Dateのみを使う)
const weekdayOfDate = (date: JstDate): number => new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay()

describe('jstDateFromMs', () => {
  it('通常のUTC時刻をJST暦日へ変換する', () => {
    const ms = Date.UTC(2026, 5, 15, 3, 0, 0)
    expect(jstDateFromMs(ms)).toEqual(referenceJstDate(ms))
    expect(jstDateFromMs(ms)).toEqual({ y: 2026, m: 6, d: 15 })
  })

  it('JST日跨ぎ境界の直前(23:59:59.999)はまだ同じ日', () => {
    // UTC 14:59:59.999 = JST 23:59:59.999 (同日)
    const ms = Date.UTC(2026, 0, 1, 14, 59, 59, 999)
    expect(jstDateFromMs(ms)).toEqual({ y: 2026, m: 1, d: 1 })
  })

  it('JST日跨ぎ境界ちょうど(UTC 15:00:00)で日付が繰り上がる', () => {
    // UTC 15:00:00.000 = JST 00:00:00.000 翌日
    const ms = Date.UTC(2026, 0, 1, 15, 0, 0, 0)
    expect(jstDateFromMs(ms)).toEqual({ y: 2026, m: 1, d: 2 })
  })

  it('年またぎの日跨ぎ境界(大晦日23:59→元日00:00)', () => {
    const beforeMidnight = Date.UTC(2025, 11, 31, 14, 59, 59, 999)
    const atMidnight = Date.UTC(2025, 11, 31, 15, 0, 0, 0)
    expect(jstDateFromMs(beforeMidnight)).toEqual({ y: 2025, m: 12, d: 31 })
    expect(jstDateFromMs(atMidnight)).toEqual({ y: 2026, m: 1, d: 1 })
  })

  it('月末境界(1/31 23:59 JST → 2/1 00:00 JST)', () => {
    const jan31 = Date.UTC(2026, 0, 31, 14, 59, 59, 999)
    const feb1 = Date.UTC(2026, 0, 31, 15, 0, 0, 0)
    expect(jstDateFromMs(jan31)).toEqual({ y: 2026, m: 1, d: 31 })
    expect(jstDateFromMs(feb1)).toEqual({ y: 2026, m: 2, d: 1 })
  })
})

describe('jstDateKey', () => {
  it('YYYY-MM-DD形式にゼロ埋めする', () => {
    expect(jstDateKey({ y: 2026, m: 3, d: 5 })).toBe('2026-03-05')
    expect(jstDateKey({ y: 2026, m: 12, d: 31 })).toBe('2026-12-31')
  })

  it('年が4桁未満でも4桁にゼロ埋めする', () => {
    expect(jstDateKey({ y: 5, m: 1, d: 1 })).toBe('0005-01-01')
  })
})

describe('jstKeyFromIso', () => {
  it('ISO8601文字列の先頭10文字をそのまま日付キーとして取り出す', () => {
    expect(jstKeyFromIso('2026-03-05T09:00:00+09:00')).toBe('2026-03-05')
    expect(jstKeyFromIso('2026-12-31T23:59:59+09:00')).toBe('2026-12-31')
  })
})

describe('addJstDays', () => {
  it('月末をまたいで加算する(1月31日+1日→2月1日)', () => {
    expect(addJstDays({ y: 2026, m: 1, d: 31 }, 1)).toEqual({ y: 2026, m: 2, d: 1 })
  })

  it('平年の2月末をまたいで加算する(2026/2/28+1日→3/1)', () => {
    expect(addJstDays({ y: 2026, m: 2, d: 28 }, 1)).toEqual({ y: 2026, m: 3, d: 1 })
  })

  it('うるう年の2月29日を経由する(2024/2/28→29→3/1)', () => {
    expect(addJstDays({ y: 2024, m: 2, d: 28 }, 1)).toEqual({ y: 2024, m: 2, d: 29 })
    expect(addJstDays({ y: 2024, m: 2, d: 28 }, 2)).toEqual({ y: 2024, m: 3, d: 1 })
  })

  it('年をまたいで加算する(2025/12/31+1日→2026/1/1)', () => {
    expect(addJstDays({ y: 2025, m: 12, d: 31 }, 1)).toEqual({ y: 2026, m: 1, d: 1 })
  })

  it('負の日数で減算できる(年またぎの逆方向)', () => {
    expect(addJstDays({ y: 2026, m: 1, d: 1 }, -1)).toEqual({ y: 2025, m: 12, d: 31 })
  })

  it('0日加算は同じ日付を返す', () => {
    expect(addJstDays({ y: 2026, m: 6, d: 15 }, 0)).toEqual({ y: 2026, m: 6, d: 15 })
  })

  it('月をまたぐ複数日加算(1/30+5日→2/4)', () => {
    expect(addJstDays({ y: 2026, m: 1, d: 30 }, 5)).toEqual({ y: 2026, m: 2, d: 4 })
  })
})

describe('isSameJstDate', () => {
  it('年月日が全て一致すればtrue', () => {
    expect(isSameJstDate({ y: 2026, m: 6, d: 15 }, { y: 2026, m: 6, d: 15 })).toBe(true)
  })

  it('日だけ違えばfalse', () => {
    expect(isSameJstDate({ y: 2026, m: 6, d: 15 }, { y: 2026, m: 6, d: 16 })).toBe(false)
  })

  it('月だけ違えばfalse', () => {
    expect(isSameJstDate({ y: 2026, m: 6, d: 15 }, { y: 2026, m: 7, d: 15 })).toBe(false)
  })

  it('年だけ違えばfalse', () => {
    expect(isSameJstDate({ y: 2026, m: 6, d: 15 }, { y: 2027, m: 6, d: 15 })).toBe(false)
  })
})

describe('jstWeekday', () => {
  it('UNIXエポック(1970-01-01、既知の木曜日)を正しく判定する', () => {
    expect(jstWeekday({ y: 1970, m: 1, d: 1 })).toBe(4)
  })

  it('2000-01-01(既知の土曜日)を正しく判定する', () => {
    expect(jstWeekday({ y: 2000, m: 1, d: 1 })).toBe(6)
  })

  it('任意の日付でDate.UTC/getUTCDayの結果と一致する', () => {
    const targets: JstDate[] = [
      { y: 2026, m: 6, d: 15 },
      { y: 2024, m: 2, d: 29 },
      { y: 2025, m: 12, d: 31 },
    ]
    for (const date of targets) {
      expect(jstWeekday(date)).toBe(weekdayOfDate(date))
    }
  })

  it('連続する日付は曜日が1ずつ(mod 7で)進む', () => {
    const base: JstDate = { y: 2026, m: 6, d: 15 }
    const next = addJstDays(base, 1)
    expect(jstWeekday(next)).toBe((jstWeekday(base) + 1) % 7)
  })
})

describe('buildMonthGrid', () => {
  it('42マス(6週分)を返す', () => {
    expect(buildMonthGrid(2026, 6).length).toBe(42)
  })

  it('先頭セルは常に日曜日(weekday=0)', () => {
    const grid = buildMonthGrid(2026, 6)
    expect(jstWeekday(grid[0])).toBe(0)
  })

  it('月の1日は、その曜日に対応するインデックスに配置される', () => {
    const y = 2026
    const m = 6
    const grid = buildMonthGrid(y, m)
    const firstWeekday = jstWeekday({ y, m, d: 1 })
    expect(grid[firstWeekday]).toEqual({ y, m, d: 1 })
  })

  it('全セルが連続した日付になっている', () => {
    const grid = buildMonthGrid(2026, 6)
    for (let i = 0; i < grid.length - 1; i += 1) {
      expect(grid[i + 1]).toEqual(addJstDays(grid[i], 1))
    }
  })

  it('うるう月(2024年2月)でも42マス・連続日付を保つ', () => {
    const grid = buildMonthGrid(2024, 2)
    expect(grid.length).toBe(42)
    for (let i = 0; i < grid.length - 1; i += 1) {
      expect(grid[i + 1]).toEqual(addJstDays(grid[i], 1))
    }
  })

  it('12月始まりでも年をまたいで翌年1月分を含む', () => {
    const grid = buildMonthGrid(2025, 12)
    const last = grid[grid.length - 1]
    // 12月分の6週グリッドは翌年1月に食い込む
    expect(last.y === 2025 || last.y === 2026).toBe(true)
    expect(grid.some((d) => d.y === 2026 && d.m === 1)).toBe(true)
  })
})

describe('jstClockLabel', () => {
  it('JSTのHH:MM形式(24時間表記)を返す', () => {
    // UTC 03:05 = JST 12:05
    const ms = Date.UTC(2026, 5, 15, 3, 5, 0)
    expect(jstClockLabel(ms)).toBe('12:05')
  })

  it('0埋めされた時刻を返す(JST 00:xx台)', () => {
    // UTC 15:07 = JST 翌日00:07
    const ms = Date.UTC(2026, 5, 15, 15, 7, 0)
    expect(jstClockLabel(ms)).toBe('00:07')
  })

  it('JST 23時台も正しく表示する', () => {
    // UTC 14:45 = JST 23:45(同日)
    const ms = Date.UTC(2026, 5, 15, 14, 45, 0)
    expect(jstClockLabel(ms)).toBe('23:45')
  })
})
