import useSWR from 'swr'
import { useCallback } from 'react'
import type {
  Employee,
  Facility,
  FacilityMeeting,
  Furniture,
  PixelAvatarConfig,
  ScheduleEvent,
  Seat,
  SeatLayout,
  StoredAvatarRecord,
  Team,
} from '@/types'
import { VIEWBOX_W, VIEWBOX_H } from '@/utils/geometry'
import {
  clearStoredLayout,
  loadCustomLayout,
  loadLayoutMetas,
  loadStoredLayout,
  saveCustomLayout,
  saveLayoutMetas,
  saveStoredLayout,
} from '@/lib/layout-persistence'
import { anchorSchedulesToDate } from '@/utils/schedule-anchor'
import { hashString } from '@/utils/hash-string'
import { useLayoutSource } from '@/contexts/layout-source-context'
import type { LayoutSource } from '@/contexts/layout-source-context'
import { useGlobalAnnouncement } from '@/components/a11y'
import employeesJson from '../mocks/employees.json'
import avatarsJson from '../mocks/avatars.json'
import teamsJson from '../mocks/teams.json'
import seatsJson from '../mocks/seats.json'
import facilitiesJson from '../mocks/facilities.json'
import furnitureJson from '../mocks/furniture.json'
import schedulesJson from '../mocks/schedules.json'
import facilityMeetingsJson from '../mocks/facility-meetings.json'

// JSON 由来の緩い型を、union フィールドを持つ確定型へ整形(このファイルが唯一の import 点)
const EMPLOYEES: Employee[] = employeesJson
const AVATAR_RECORDS: StoredAvatarRecord[] = avatarsJson.map((r) => ({
  ...r,
  config: r.config as PixelAvatarConfig,
}))

// アバターの種データ。上書き合流は hooks/use-avatars.ts が担う
export const seedAvatarRecords = (): StoredAvatarRecord[] => AVATAR_RECORDS
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
// 家具の種データ。初期は空で、編集モードで置いたぶんは保存レイアウト側に載る
const FURNITURE: Furniture[] = furnitureJson as Furniture[]
// モックは生成時の1日分しか持たないので、日付を「今日」へ寄せてから配る
// (寄せないと翌日以降は全員在席・予定ゼロになる)
const SCHEDULES: ScheduleEvent[] = anchorSchedulesToDate(
  schedulesJson.map((s) => ({ ...s, category: s.category as ScheduleEvent['category'] })),
  Date.now()
)
const FACILITY_MEETINGS: FacilityMeeting[] = facilityMeetingsJson

// デモは 1フロア固定
const FLOOR_ID = 'floor-1'
export const FLOOR_NAME = '本社1F'
// lib/geometry.ts の定数から生成(数値を重複させず、キャンバス側と乖離しないようにする)
const VIEWBOX = { width: VIEWBOX_W, height: VIEWBOX_H }

// キャッシュ+再試行(stale-while-revalidate 模倣)
const CACHE_PREFIX = 'seatmap::'
const FORCE_FAIL = false // true で強制失敗→指数バックオフ確認
const responseDelay = () => 200 + Math.floor(Math.random() * 300)

// シードデータ本体から指紋を計算(手動バージョン定数は持たない。上げ忘れによる同種バグの再発防止)
const fingerprintOf = <T,>(data: T): string => hashString(JSON.stringify(data))

// 新キャッシュ形式(封筒): シード指紋を同梱し、シード変更時に自動無効化する
type CacheEnvelope<T> = {
  fingerprint: string
  data: T
}

const isCacheEnvelope = <T,>(value: unknown): value is CacheEnvelope<T> =>
  typeof value === 'object' &&
  value !== null &&
  'fingerprint' in value &&
  'data' in value &&
  typeof (value as { fingerprint: unknown }).fingerprint === 'string'

const readCache = <T,>(name: string, fingerprint: string): T | undefined => {
  try {
    if (typeof window === 'undefined') return undefined
    const raw = window.localStorage.getItem(CACHE_PREFIX + name)
    if (!raw) return undefined
    const parsed: unknown = JSON.parse(raw)
    // 旧形式(配列そのまま)や指紋不一致(シード更新)はキャッシュミス扱い
    if (!isCacheEnvelope<T>(parsed) || parsed.fingerprint !== fingerprint) return undefined
    return parsed.data
  } catch {
    return undefined
  }
}

const writeCache = <T,>(name: string, data: T, fingerprint: string): void => {
  try {
    if (typeof window === 'undefined') return
    const envelope: CacheEnvelope<T> = { fingerprint, data }
    window.localStorage.setItem(CACHE_PREFIX + name, JSON.stringify(envelope))
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
const useCached = <T,>(name: string, data: T) => {
  const fingerprint = fingerprintOf(data)
  return useSWR<T>(
    `mock/${name}`,
    async () => {
      // キャッシュヒットは即返す(fetcherはマウント後実行なのでSSR不整合は起きない)
      const cached = readCache<T>(name, fingerprint)
      if (cached !== undefined) return cached
      const fresh = await fetchWithRetry(data)
      writeCache(name, fresh, fingerprint)
      return fresh
    },
    { revalidateOnFocus: false }
  )
}

// 各データの SWR フック(キャッシュ優先・失敗時リトライ付き)
export const useEmployees = () => useCached('employees', EMPLOYEES)

export const useTeams = () => useCached('teams', TEAMS)

// 座席は useSeatLayout(保存済みレイアウトを被せる)経由でしか配らない。
// 種データを直接引くと編集結果と食い違うため export しない
const useSeats = () => useCached('seats', SEATS)

export const useFacilities = () => useCached('facilities', FACILITIES)

const useFurniture = () => useCached('furniture', FURNITURE)

export const useSchedules = () => useCached('schedules', SCHEDULES)

export const useFacilityMeetings = () => useCached('facility-meetings', FACILITY_MEETINGS)

// 07: 保存済みレイアウトの上書き分を扱うSWRキー(mock/系に合わせ、mutateで表示即時更新できるようにする)。
// STEP2: source(公式/カスタム)ごとにキーを分ける。固定のままだと切り替えても前のキャッシュが返り続ける
const OFFICIAL_LAYOUT_SWR_KEY = 'mock/layout-override'
const customLayoutSwrKey = (layoutId: string): string => `mock/layout:${layoutId}`
const layoutSwrKey = (source: LayoutSource): string =>
  source.type === 'official' ? OFFICIAL_LAYOUT_SWR_KEY : customLayoutSwrKey(source.layoutId)

// カスタムレイアウトのメタ一覧から対象1件だけ updatedAt を打ち直す
const touchLayoutMetaUpdatedAt = (layoutId: string): void => {
  const updatedAt = new Date().toISOString()
  saveLayoutMetas(
    loadLayoutMetas().map((meta) => (meta.layoutId === layoutId ? { ...meta, updatedAt } : meta))
  )
}

// SeatLayout はローダーが teams+seats+facilities を合成(種データ側)。
// その上に、source(公式/カスタム)に応じた保存分をlocalStorageから上書き適用する。
// 読み込みはSWRのfetcherがマウント後に実行される既存の仕組み(useCached参照)に乗せるため
// SSR不整合は起きない
export const useSeatLayout = () => {
  const { source } = useLayoutSource()
  const { announce } = useGlobalAnnouncement()
  const { data: teams } = useTeams()
  const { data: seats } = useSeats()
  const { data: facilities } = useFacilities()
  const { data: furniture } = useFurniture()
  const composed: SeatLayout | undefined =
    teams && seats && facilities && furniture
      ? {
          floorId: FLOOR_ID,
          floorName: FLOOR_NAME,
          viewBox: VIEWBOX,
          seats,
          teams,
          facilities,
          furniture,
        }
      : undefined

  const { data: override, mutate: mutateOverride } = useSWR<SeatLayout | null>(
    layoutSwrKey(source),
    async () => {
      if (source.type === 'official') return loadStoredLayout()
      const custom = loadCustomLayout(source.layoutId)
      if (custom) return custom
      // カスタムの保存分が見つからない(削除済み等): 公式へフォールバックして通知する
      announce('[warning]表示中のレイアウトが見つからないため公式レイアウトを表示しています')
      return loadStoredLayout()
    },
    { revalidateOnFocus: false }
  )

  // 保存分があればそちらを採用、無ければ種データ合成分にフォールバック
  const layout = override ?? composed

  // 完了時: 保存書き込み+SWRキャッシュへ直接反映(再取得を挟まず表示を即時更新)。
  // カスタム表示中はカスタムの保存先へ書き、LayoutMeta.updatedAt も併せて更新する
  const persistLayout = useCallback(
    async (next: SeatLayout) => {
      if (source.type === 'official') {
        saveStoredLayout(next)
      } else {
        saveCustomLayout(source.layoutId, next)
        touchLayoutMetaUpdatedAt(source.layoutId)
      }
      await mutateOverride(next, false)
    },
    [source, mutateOverride]
  )

  // 設定操作「レイアウトをリセット」: 公式表示中のみ有効。保存分を削除して種データ合成分へ復帰する。
  // カスタム表示中はリセット対象が無いため no-op
  const resetLayout = useCallback(async () => {
    if (source.type !== 'official') return
    clearStoredLayout()
    await mutateOverride(null, false)
  }, [source, mutateOverride])

  return { layout, isLoading: !layout, persistLayout, resetLayout }
}
