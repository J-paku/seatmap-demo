import { jstDateFromMs, jstDateKey } from './jst-date'
import type { ScheduleEvent } from '@/types'

// モックの予定は生成時の1日分しか持たないため、そのままだと翌日以降は
// 全員「在席」・予定ゼロの死んだデモになる。読み込み時に日付部分だけを
// 「今日」へ差し替えて、いつ開いても当日分として成立させる。
// 時刻とタイムゾーン(+09:00)はJSONの値をそのまま使う

// ISO8601 の先頭10文字が JST の暦日そのもの(TZ変換不要)
const DATE_LENGTH = 10

const withDate = (iso: string, dateKey: string): string => dateKey + iso.slice(DATE_LENGTH)

export const anchorSchedulesToDate = (events: ScheduleEvent[], nowMs: number): ScheduleEvent[] => {
  const dateKey = jstDateKey(jstDateFromMs(nowMs))
  return events.map((e) => ({
    ...e,
    start: withDate(e.start, dateKey),
    end: withDate(e.end, dateKey),
  }))
}
