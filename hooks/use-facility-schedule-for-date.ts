import { useEffect, useMemo, useRef, useState } from 'react'
import type { FacilityMeeting } from '@/types'
import { useEmployees, useFacilityMeetings } from '@/lib/mock-loader'
import { meetingsForDate } from '@/utils/facility-meetings-for-date'
import { useSelectedDate } from '@/contexts/selected-date-context'
import { jstDateKey } from '@/utils/jst-date'
import { hashStringToInt } from '@/utils/hash-string'

// 生成の擬似遅延(仕様: 200〜500ms)
const DELAY_MIN_MS = 200
const DELAY_MAX_MS = 500
const DELAY_SPAN_MS = DELAY_MAX_MS - DELAY_MIN_MS

// dateKeyとfacilityIdから決定論的な遅延値(200〜500ms)を求める。Math.random()は使わない
const deterministicDelay = (dateKey: string, facilityId: string): number => {
  const state = hashStringToInt(`${dateKey}#${facilityId}`)
  return DELAY_MIN_MS + ((state >>> 0) % DELAY_SPAN_MS)
}

type UseFacilityScheduleForDateArgs = {
  facilityId: string
  dateKey: string
  isTodaySelected: boolean
}

type UseFacilityScheduleForDateResult = {
  meetings: FacilityMeeting[]
  isLoading: boolean
}

// 会議室パネル用: 選択日の予約一覧を取得する
// 本日は即時反映・isLoading=false、本日以外はdateKey変化のたびに200〜500msの遅延を挟んで
// 結果を反映しその間isLoading=trueにする。アンマウント/日付再変更時は前の待機をキャンセルする
export const useFacilityScheduleForDate = ({
  facilityId,
  dateKey,
  isTodaySelected,
}: UseFacilityScheduleForDateArgs): UseFacilityScheduleForDateResult => {
  const { data: seedMeetings } = useFacilityMeetings()
  const { data: employees } = useEmployees()
  const { today } = useSelectedDate()
  const todayKey = jstDateKey(today)
  const seed = useMemo(() => seedMeetings ?? [], [seedMeetings])
  const employeeIds = useMemo(() => (employees ?? []).map((e) => e.id), [employees])

  const [meetings, setMeetings] = useState<FacilityMeeting[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    // isTodaySelectedは遅延・ローディング表示のみを制御する。種データ/生成の分岐は
    // meetingsForDate内のdateKey===todayKey比較が単独で決める(真のtodayKeyを両分岐に渡す)
    // 当日は遅延を挟まず即時確定させる。取得の擬似遅延を伴う非同期処理なので
    // 描画中に導出できず、effect から状態を確定する以外の置き場が無い
    if (isTodaySelected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false)
      setMeetings(meetingsForDate(seed, facilityId, dateKey, todayKey, employeeIds))
      return
    }

    setIsLoading(true)
    const delay = deterministicDelay(dateKey, facilityId)
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null
      setMeetings(meetingsForDate(seed, facilityId, dateKey, todayKey, employeeIds))
      setIsLoading(false)
    }, delay)

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [facilityId, dateKey, isTodaySelected, todayKey, seed, employeeIds])

  return { meetings, isLoading }
}
