import type { PresenceStatus, ScheduleEvent } from '@/types'

// 同時進行時の優先度(vacation > out > meeting)。先頭ほど強い
const PRIORITY: readonly ScheduleEvent['category'][] = ['vacation', 'out', 'meeting']

// 指定日(その社員の当日イベント)+ now から在席ステータスを判定する
// isTodaySelected=false のときは「進行中」判定を行わず present 固定(当日以外は現在時刻概念なし)
const presenceForEmployee = (
  events: ScheduleEvent[],
  nowMs: number,
  useNow: boolean
): PresenceStatus => {
  // 優先1: 終日(休暇)があれば終日 vacation
  if (events.some(e => e.isAllDay && e.category === 'vacation')) return 'vacation'
  if (!useNow) return 'present'
  // 優先2: 進行中イベントの区分のうち、優先度が最も高いもの
  const ongoing = new Set(
    events
      .filter(e => Date.parse(e.start) <= nowMs && nowMs < Date.parse(e.end))
      .map(e => e.category)
  )
  return PRIORITY.find(category => ongoing.has(category)) ?? 'present'
}

// 対象日の全イベント + now → employeeId → PresenceStatus の Map
export const computePresenceMap = (
  schedules: ScheduleEvent[],
  nowMs: number,
  useNow: boolean
): Map<string, PresenceStatus> => {
  const byEmp = new Map<string, ScheduleEvent[]>()
  for (const e of schedules) {
    const arr = byEmp.get(e.employeeId)
    if (arr) arr.push(e)
    else byEmp.set(e.employeeId, [e])
  }
  const result = new Map<string, PresenceStatus>()
  for (const [empId, events] of byEmp) {
    result.set(empId, presenceForEmployee(events, nowMs, useNow))
  }
  return result
}
