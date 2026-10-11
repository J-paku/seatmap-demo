import type { PresenceStatus, ScheduleEvent } from '@/types'
import { SELF_EMPLOYEE_ID } from '@/utils/demo-identity'
import { jstClockLabel as jstClockLabelImpl } from '@/utils/jst-date'

// ISO8601(+09:00)から HH:MM を取り出す(表示専用・TZ 変換なし)
const hhmm = (iso: string): string => iso.slice(11, 16)

// 取得時刻の表示(JST の HH:MM)。予定の文字列と違い epoch ms から出すので TZ 指定が要る
export const jstClockLabel = (ms: number): string => jstClockLabelImpl(ms)

// 予定の時刻表示(終日 or HH:MM - HH:MM)
export const scheduleTimeLabel = (e: ScheduleEvent): string =>
  e.isAllDay ? '終日' : `${hhmm(e.start)} - ${hhmm(e.end)}`

// 非公開予定を伏せるか。本人の予定は伏せない(自分の予定表では件名が見える)
export const isScheduleMasked = (e: ScheduleEvent): boolean => !!e.isPrivate && e.employeeId !== SELF_EMPLOYEE_ID

// 予定の件名表示。非公開のものと件名が空のものは「予定あり」だけを出す
export const scheduleTitleLabel = (e: ScheduleEvent): string =>
  isScheduleMasked(e) ? '予定あり' : e.title || '予定あり'

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

// 在席ステータス表示色。色そのものは持たず tokens.css の定義を指す
// (キャンバス・オーバーレイ・チップで別々に持っていたのを1箇所へ寄せた)
export const PRESENCE_COLOR: Record<PresenceStatus, string> = {
  present: 'var(--color-status-present)',
  meeting: 'var(--color-status-meeting)',
  out: 'var(--color-status-out)',
  vacation: 'var(--color-status-vacation)',
}
