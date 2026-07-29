import type { ScheduleEvent } from '@/types'

// ISO8601(+09:00)から HH:MM を取り出す(表示専用・TZ 変換なし)
export const hhmm = (iso: string): string => iso.slice(11, 16)

// 予定の時刻表示(終日 or HH:MM - HH:MM)
export const scheduleTimeLabel = (e: ScheduleEvent): string =>
  e.isAllDay ? '終日' : `${hhmm(e.start)} - ${hhmm(e.end)}`

// カテゴリ表示ラベル
export const CATEGORY_LABEL: Record<ScheduleEvent['category'], string> = {
  meeting: '会議',
  out: '外出',
  vacation: '休暇',
}

// 施設 kind ラベル
export const FACILITY_KIND_LABEL: Record<'meeting' | 'booth' | 'common', string> = {
  meeting: '会議室',
  booth: 'ブース',
  common: '共用スペース',
}
