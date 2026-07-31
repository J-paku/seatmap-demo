// 04-date-navigator: JST固定の暦日ユーティリティ(年月日単位・時刻を持たない)

// JST基準の暦日(時刻を持たない)
export type JstDate = { y: number; m: number; d: number }

const JST_PARTS_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// epoch ms → JST暦日
export const jstDateFromMs = (ms: number): JstDate => {
  const parts = JST_PARTS_FORMATTER.formatToParts(new Date(ms))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return { y: get('year'), m: get('month'), d: get('day') }
}

// JST暦日を昼12:00 UTCのタイムスタンプへ写像(加減算専用・表示には使わない)
const jstDateToNoonMs = (date: JstDate): number => Date.UTC(date.y, date.m - 1, date.d, 12, 0, 0)

// JST暦日 → YYYY-MM-DD (ScheduleEvent.start の日付部分比較用)
export const jstDateKey = (date: JstDate): string =>
  `${date.y.toString().padStart(4, '0')}-${date.m.toString().padStart(2, '0')}-${date.d.toString().padStart(2, '0')}`

// ISO8601(+09:00)の start から JST暦日キー(YYYY-MM-DD)を取り出す(TZ変換不要・先頭10文字がJST日付そのもの)
export const jstKeyFromIso = (iso: string): string => iso.slice(0, 10)

// JST暦日を n日ずらす
export const addJstDays = (date: JstDate, n: number): JstDate => jstDateFromMs(jstDateToNoonMs(date) + n * 86400000)

// 2つのJST暦日が同一か
export const isSameJstDate = (a: JstDate, b: JstDate): boolean => a.y === b.y && a.m === b.m && a.d === b.d

// JST暦日の曜日(0=日〜6=土)
export const jstWeekday = (date: JstDate): number => new Date(jstDateToNoonMs(date)).getUTCDay()

// 月初セルから月末セルまでを6週分(42マス)並べたグリッドを作る(前後月の日付含む)
export const buildMonthGrid = (y: number, m: number): JstDate[] => {
  const first: JstDate = { y, m, d: 1 }
  const firstWeekday = jstWeekday(first)
  const start = addJstDays(first, -firstWeekday)
  const cells: JstDate[] = []
  for (let i = 0; i < 42; i++) cells.push(addJstDays(start, i))
  return cells
}
