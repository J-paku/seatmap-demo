import { FLOORS } from '@/utils/floors'
import type {
  Employee,
  Facility,
  FacilityMeeting,
  FloorId,
  Furniture,
  PixelAvatarConfig,
  ScheduleEvent,
  Seat,
  StoredAvatarRecord,
  Team,
} from '@/types'
import { VIEWBOX_W, VIEWBOX_H } from '@/utils/layout/geometry'
import { loadLayoutMetas, saveLayoutMetas } from '@/lib/layout-persistence'
import { anchorSchedulesToDate } from '@/utils/schedule-anchor'
import { hashString } from '@/utils/hash-string'
import employeesJson from '../mocks/employees.json'
import avatarsJson from '../mocks/avatars.json'
import teamsJson from '../mocks/teams.json'
import seatsJson from '../mocks/seats.json'
import facilitiesJson from '../mocks/facilities.json'
import furnitureJson from '../mocks/furniture.json'
import teamsFloor2Json from '../mocks/floor-2/teams.json'
import seatsFloor2Json from '../mocks/floor-2/seats.json'
import facilitiesFloor2Json from '../mocks/floor-2/facilities.json'
import furnitureFloor2Json from '../mocks/floor-2/furniture.json'
import schedulesJson from '../mocks/schedules.json'
import facilityMeetingsJson from '../mocks/facility-meetings.json'

// JSON 由来の緩い型を、union フィールドを持つ確定型へ整形(このファイルが唯一の import 点)
export const EMPLOYEES: Employee[] = employeesJson
const AVATAR_RECORDS: StoredAvatarRecord[] = avatarsJson.map((r) => ({
  ...r,
  config: r.config as PixelAvatarConfig,
}))

// アバターの種データ。上書き合流は hooks/use-avatars.ts が担う
export const seedAvatarRecords = (): StoredAvatarRecord[] => AVATAR_RECORDS

// JSON の緩い型(rotation・kind が number/string)を受ける入口の形。フロアぶん同じ整形を通す
type RawSeat = Omit<Seat, 'rotation'> & { rotation: number }
type RawFacility = Omit<Facility, 'kind'> & { kind: string }
type RawFurniture = Omit<Furniture, 'kind' | 'rotation'> & { kind: string; rotation: number }

const toSeats = (raw: RawSeat[]): Seat[] =>
  raw.map((s) => ({ ...s, rotation: s.rotation as Seat['rotation'] }))
const toFacilities = (raw: RawFacility[]): Facility[] =>
  raw.map((f) => ({ ...f, kind: f.kind as Facility['kind'] }))
// 家具の種データ。初期は空で、編集モードで置いたぶんは保存レイアウト側に載る
const toFurniture = (raw: RawFurniture[]): Furniture[] =>
  raw.map((f) => ({
    ...f,
    kind: f.kind as Furniture['kind'],
    rotation: f.rotation as Furniture['rotation'],
  }))

// フロアごとの種データ。Record<FloorId, ...> なので types の FLOORS へ足したフロアの
// 登録漏れは型エラーになる(一覧とデータが片方だけ増える経路を塞ぐ)
type FloorSeed = {
  teams: Team[]
  seats: Seat[]
  facilities: Facility[]
  furniture: Furniture[]
}

export const FLOOR_SEEDS: Record<FloorId, FloorSeed> = {
  'floor-1': {
    teams: teamsJson,
    seats: toSeats(seatsJson),
    facilities: toFacilities(facilitiesJson),
    furniture: toFurniture(furnitureJson),
  },
  'floor-2': {
    teams: teamsFloor2Json,
    seats: toSeats(seatsFloor2Json),
    facilities: toFacilities(facilitiesFloor2Json),
    furniture: toFurniture(furnitureFloor2Json),
  },
}

// 全フロア分を結合した一覧。社員→所属チーム名・チーム色や会議室名の解決は表示中フロアに依らないため、
// 一覧としてはフロアを跨いで配る(1F表示中でも2F所属社員の所属・色が引ける)。
// キャンバスへ描くチーム箱・会議室は表示中フロアぶんだけで、そちらは useSeatLayout が配る
export const ALL_TEAMS: Team[] = FLOORS.flatMap((floor) => FLOOR_SEEDS[floor.floorId].teams)
export const ALL_FACILITIES: Facility[] = FLOORS.flatMap(
  (floor) => FLOOR_SEEDS[floor.floorId].facilities
)
// モックは生成時の1日分しか持たないので、日付を「今日」へ寄せてから配る
// (寄せないと翌日以降は全員在席・予定ゼロになる)
export const SCHEDULES: ScheduleEvent[] = anchorSchedulesToDate(
  schedulesJson.map((s) => ({ ...s, category: s.category as ScheduleEvent['category'] })),
  Date.now()
)
export const FACILITY_MEETINGS: FacilityMeeting[] = facilityMeetingsJson

// lib/geometry.ts の定数から生成(数値を重複させず、キャンバス側と乖離しないようにする)
export const VIEWBOX = { width: VIEWBOX_W, height: VIEWBOX_H }

// キャッシュ+再試行(stale-while-revalidate 模倣)
const CACHE_PREFIX = 'seatmap::'
const FORCE_FAIL = false // true で強制失敗→指数バックオフ確認
const responseDelay = () => 200 + Math.floor(Math.random() * 300)

// シードデータ本体から指紋を計算(手動バージョン定数は持たない。上げ忘れによる同種バグの再発防止)。
// 静的データでnameごとの内容は変わらないため、name単位でメモ化する
// (JSON.stringifyは配列が大きいとコストが無視できず、useCachedは呼び出し側のレンダーのたび実行されるため)
const fingerprintCache = new Map<string, string>()
export const fingerprintOf = <T,>(name: string, data: T): string => {
  const cached = fingerprintCache.get(name)
  if (cached !== undefined) return cached
  const fingerprint = hashString(JSON.stringify(data))
  fingerprintCache.set(name, fingerprint)
  return fingerprint
}

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

export const readCache = <T,>(name: string, fingerprint: string): T | undefined => {
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

export const writeCache = <T,>(name: string, data: T, fingerprint: string): void => {
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
export const fetchWithRetry = async <T,>(data: T): Promise<T> => {
  await wait(responseDelay())
  if (!FORCE_FAIL) return data
  // 強制失敗時: 指数バックオフ(1s→2s→4s)。全滅しても空で死なずデータを返す(原本: 失敗しても空画面)
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await wait(1000 * 2 ** attempt)
    await wait(responseDelay())
  }
  return data
}

// カスタムレイアウトのメタ一覧から対象1件だけ updatedAt を打ち直す
export const touchLayoutMetaUpdatedAt = (layoutId: string): void => {
  const updatedAt = new Date().toISOString()
  saveLayoutMetas(
    loadLayoutMetas().map((meta) => (meta.layoutId === layoutId ? { ...meta, updatedAt } : meta))
  )
}
