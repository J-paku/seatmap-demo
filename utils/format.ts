import type { PresenceStatus, ScheduleEvent } from '@/types'

// ISO8601(+09:00)から HH:MM を取り出す(表示専用・TZ 変換なし)
const hhmm = (iso: string): string => iso.slice(11, 16)

// 予定の時刻表示(終日 or HH:MM - HH:MM)
export const scheduleTimeLabel = (e: ScheduleEvent): string =>
  e.isAllDay ? '終日' : `${hhmm(e.start)} - ${hhmm(e.end)}`

// カテゴリ表示ラベル
export const CATEGORY_LABEL: Record<ScheduleEvent['category'], string> = {
  meeting: '会議',
  out: '外出',
  vacation: '休暇',
}

// 在席ステータス表示ラベル
export const PRESENCE_LABEL: Record<PresenceStatus, string> = {
  present: '在席',
  meeting: '会議',
  out: '外出',
  vacation: '休暇',
}
