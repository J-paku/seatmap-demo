import useSWR from 'swr'
import type { Employee, Facility, ScheduleEvent, Seat, SeatLayout, Team } from './types'
import employeesJson from '../mocks/employees.json'
import teamsJson from '../mocks/teams.json'
import seatsJson from '../mocks/seats.json'
import facilitiesJson from '../mocks/facilities.json'
import schedulesJson from '../mocks/schedules.json'

// JSON 由来の緩い型を、union フィールドを持つ確定型へ整形(このファイルが唯一の import 点)
const EMPLOYEES: Employee[] = employeesJson.map((e) => ({
  ...e,
  avatar: e.avatar as Employee['avatar'],
}))
const TEAMS: Team[] = teamsJson
const SEATS: Seat[] = seatsJson.map((s) => ({
  ...s,
  rotation: s.rotation as Seat['rotation'],
  employeeId: s.employeeId as string | null,
}))
const FACILITIES: Facility[] = facilitiesJson.map((f) => ({
  ...f,
  kind: f.kind as Facility['kind'],
}))
const SCHEDULES: ScheduleEvent[] = schedulesJson.map((s) => ({
  ...s,
  category: s.category as ScheduleEvent['category'],
}))

// デモは 1フロア固定
const FLOOR_ID = 'floor-1'
const FLOOR_NAME = '本社1F'
const VIEWBOX = { width: 1600, height: 900 }

// キャッシュ+再試行(stale-while-revalidate 模倣)
const CACHE_PREFIX = 'seatmap::'
const FORCE_FAIL = false // true で強制失敗→指数バックオフ確認
const responseDelay = () => 200 + Math.floor(Math.random() * 300)

const readCache = <T,>(name: string): T | undefined => {
  try {
    if (typeof window === 'undefined') return undefined
    const raw = window.localStorage.getItem(CACHE_PREFIX + name)
    return raw ? (JSON.parse(raw) as T) : undefined
  } catch {
    return undefined
  }
}

const writeCache = <T,>(name: string, data: T): void => {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(CACHE_PREFIX + name, JSON.stringify(data))
  } catch {
    // 容量超過などは無視(デモではキャッシュ失敗を致命としない)
  }
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// 静的データを「遅延つき取得」として返す。FORCE_FAIL 時のみ 1s→2s→4s の指数バックオフで3回再試行
const fetchWithRetry = async <T,>(data: T): Promise<T> => {
  await wait(responseDelay())
  if (!FORCE_FAIL) return data
  // 強制失敗時: 指数バックオフ(1s→2s→4s)。全滅しても空で死なずデータを返す(原本: 失敗しても空画面)
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await wait(1000 * 2 ** attempt)
    await wait(responseDelay())
  }
  return data
}

// キャッシュ即時描画(fallbackData)+バックグラウンド再取得(SWR)+取得成功時にキャッシュ更新
const useCached = <T,>(name: string, data: T) =>
  useSWR<T>(
    `mock/${name}`,
    async () => {
      const fresh = await fetchWithRetry(data)
      writeCache(name, fresh)
      return fresh
    },
    { fallbackData: readCache<T>(name), revalidateOnFocus: false }
  )

// 各データの SWR フック(キャッシュ優先・失敗時リトライ付き)
export const useEmployees = () => useCached('employees', EMPLOYEES)

export const useTeams = () => useCached('teams', TEAMS)

export const useSeats = () => useCached('seats', SEATS)

export const useFacilities = () => useCached('facilities', FACILITIES)

export const useSchedules = () => useCached('schedules', SCHEDULES)

// SeatLayout はローダーが teams+seats+facilities を合成
export const useSeatLayout = () => {
  const { data: teams } = useTeams()
  const { data: seats } = useSeats()
  const { data: facilities } = useFacilities()
  const layout: SeatLayout | undefined =
    teams && seats && facilities
      ? {
          floorId: FLOOR_ID,
          floorName: FLOOR_NAME,
          viewBox: VIEWBOX,
          seats,
          teams,
          facilities,
        }
      : undefined
  return { layout, isLoading: !layout }
}
