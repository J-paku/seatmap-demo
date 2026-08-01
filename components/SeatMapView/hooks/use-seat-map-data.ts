import { useMemo, useState } from 'react'
import type { LayoutEditor } from '../type'
import { deriveFacilityState } from '@/utils/facility-status'
import type { FacilityState } from '@/utils/facility-status'
import { useEmployees, useFacilityMeetings, useSchedules, useSeatLayout } from '@/lib/mock-loader'
import { computePresenceMap } from '@/utils/presence'
import { useSelectedDate } from '@/contexts/selected-date-context'
import { jstDateKey, jstKeyFromIso } from '@/utils/jst-date'
import { useQuantizedClock } from '@/hooks/use-quantized-clock'
import type { Employee, PresenceStatus, SeatLayout } from '@/types'

// 表示に必要なデータの合成。編集モード中は在席状態を凍結し、レイアウトも編集中のものへ切り替える

type SeatMapData = {
  ready: boolean
  employeeById: Map<string, Employee>
  effectiveLayout: SeatLayout | undefined
  effectivePresenceMap: Map<string, PresenceStatus>
  facilityStateById: Map<string, FacilityState>
}

export const useSeatMapData = (editor: LayoutEditor): SeatMapData => {
  const { layout } = useSeatLayout()
  const { data: employees } = useEmployees()
  const { data: schedules } = useSchedules()
  const { data: facilityMeetings } = useFacilityMeetings()
  const { debouncedDate, isTodaySelected } = useSelectedDate()
  // 現在時刻の進行中判定は「今日」を表示中の時だけ稼働
  const nowMs = useQuantizedClock(isTodaySelected)

  // アバターの上書きは AvatarsContext(ownerCode キー)が持つため、ここでは素の社員を配るだけ
  const employeeById = useMemo(
    () => new Map((employees ?? []).map((e) => [e.id, e])),
    [employees]
  )

  // debouncedDate 当日分のイベントに絞ってから在席判定
  const schedulesForDate = useMemo(() => {
    const key = jstDateKey(debouncedDate)
    return (schedules ?? []).filter((s) => jstKeyFromIso(s.start) === key)
  }, [schedules, debouncedDate])

  // 07: 編集モード中は在席状態の再計算を停止(baseline時点のスナップショットで固定)
  const presenceMap = useMemo(
    () => computePresenceMap(schedulesForDate, nowMs, isTodaySelected),
    [schedulesForDate, nowMs, isTodaySelected]
  )
  // 編集モードへ入った瞬間の presenceMap を state に退避する。
  // 以前は ref をレンダー中に書き換えていたが、レンダーは副作用を持てない(StrictMode の
  // 二重レンダーや中断レンダーで書き込み回数が変わる)。React の「レンダー中に state を調整する」
  // 手順に置き換え、切り替わりを検知した回だけ setState する
  const [wasEditMode, setWasEditMode] = useState(editor.isEditMode)
  const [frozenPresenceMap, setFrozenPresenceMap] = useState(presenceMap)
  if (wasEditMode !== editor.isEditMode) {
    setWasEditMode(editor.isEditMode)
    if (editor.isEditMode) setFrozenPresenceMap(presenceMap)
  }
  const effectivePresenceMap = editor.isEditMode ? frozenPresenceMap : presenceMap

  // 07: 表示ソース切り替え(編集中はeditingLayout・それ以外は通常ロード分)
  const effectiveLayout = editor.isEditMode ? editor.editingLayout ?? layout : layout

  // 会議室状態(今日表示中のみ現在時刻で導出。他日は連携有無だけ)
  const nowMin = useMemo(() => {
    const d = new Date(nowMs)
    return d.getHours() * 60 + d.getMinutes()
  }, [nowMs])

  const facilityStateById = useMemo(() => {
    const map = new Map<string, FacilityState>()
    if (!effectiveLayout) return map
    const meetings = facilityMeetings ?? []
    for (const f of effectiveLayout.facilities) {
      map.set(
        f.id,
        isTodaySelected ? deriveFacilityState(f, meetings, nowMin) : { status: f.facilityId ? 'available' : 'unlinked' }
      )
    }
    return map
  }, [effectiveLayout, facilityMeetings, nowMin, isTodaySelected])

  return {
    ready: Boolean(layout && employees && schedules),
    employeeById,
    effectiveLayout,
    effectivePresenceMap,
    facilityStateById,
  }
}
