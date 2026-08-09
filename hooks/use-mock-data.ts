// モックデータのキャッシュ購読フック群(SWR)。取得コア(シード・キャッシュ入出力・疑似遅延)は lib/mock-loader.ts に置く
import useSWR from 'swr'
import { useCallback, useMemo } from 'react'
import { DEFAULT_FLOOR_ID, floorNameOf } from '@/utils/floors'
import type { FloorId, SeatLayout } from '@/types'
import {
  clearStoredLayout,
  loadCustomLayout,
  loadStoredLayout,
  saveCustomLayout,
  saveStoredLayout,
} from '@/lib/layout-persistence'
import {
  ALL_FACILITIES,
  ALL_TEAMS,
  EMPLOYEES,
  FACILITY_MEETINGS,
  FLOOR_SEEDS,
  SCHEDULES,
  VIEWBOX,
  fetchWithRetry,
  fingerprintOf,
  readCache,
  touchLayoutMetaUpdatedAt,
  writeCache,
} from '@/lib/mock-loader'
import { useLayoutSource } from '@/contexts/layout-source-context'
import type { LayoutSource } from '@/contexts/layout-source-context'
import { useGlobalAnnouncement } from '@/contexts/announcement-context'

// 実在する社員idの集合。保存レイアウトを読む時に、実在しない社員を指す座席を空席へ戻すために渡す。
// EMPLOYEES はモジュール定数で初回レンダー時点から確定しているのでモジュールスコープに置く
// (useEmployees() の SWR データを使うと初期レンダーで undefined になり、その時だけ全座席が
// 空席に見えるレースが起きる)
const VALID_EMPLOYEE_IDS: ReadonlySet<string> = new Set(EMPLOYEES.map((employee) => employee.id))

// キャッシュ即時描画(fallbackData)+バックグラウンド再取得(SWR)+取得成功時にキャッシュ更新
const useCached = <T,>(name: string, data: T, fallbackData?: T) => {
  const fingerprint = fingerprintOf(name, data)
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
    { revalidateOnFocus: false, fallbackData }
  )
}

// 各データの SWR フック(キャッシュ優先・失敗時リトライ付き)
export const useEmployees = () => useCached('employees', EMPLOYEES)

export const useTeams = () => useCached('teams', ALL_TEAMS)

export const useFacilities = () => useCached('facilities', ALL_FACILITIES)

// 表示中フロアの種データをまとめて引く。座席は useSeatLayout(保存済みレイアウトを被せる)経由でしか
// 配らない。種データを直接引くと編集結果と食い違うため export しない。
//
// teams/facilities は useTeams/useFacilities(全フロア共通の 'teams'/'facilities' キー)をそのまま
// 再利用し、フロア分の絞り込みはメモリ上の FLOOR_SEEDS から行う(フロア別キーで別途フェッチ+
// キャッシュすると同じ種データを二重に持つため。#23)。
// seats/furniture は全フロア版が無いため従来どおりキャッシュ名にフロアidを含め、切り替え時に前の
// フロアの値が返らないようにする。新規キーでも初回から即値を返すよう seed 自身を fallbackData に
// 渡す(#5: フロア切替時に一瞬アンマウントするのを防ぐ)
const useFloorSeed = (floorId: FloorId) => {
  const seed = FLOOR_SEEDS[floorId]
  const { data: allTeams } = useTeams()
  const { data: allFacilities } = useFacilities()
  const { data: seats } = useCached(`seats:${floorId}`, seed.seats, seed.seats)
  const { data: furniture } = useCached(`furniture:${floorId}`, seed.furniture, seed.furniture)
  return {
    teams: allTeams ? seed.teams : undefined,
    seats,
    facilities: allFacilities ? seed.facilities : undefined,
    furniture,
  }
}

export const useSchedules = () => useCached('schedules', SCHEDULES)

export const useFacilityMeetings = () => useCached('facility-meetings', FACILITY_MEETINGS)

// 07: 保存済みレイアウトの上書き分を扱うSWRキー(mock/系に合わせ、mutateで表示即時更新できるようにする)。
// STEP2: source(公式のフロア/カスタム)ごとにキーを分ける。固定のままだと切り替えても前のキャッシュが返り続ける
const officialLayoutSwrKey = (floorId: FloorId): string => `mock/layout-override:${floorId}`
const customLayoutSwrKey = (layoutId: string): string => `mock/layout:${layoutId}`
const layoutSwrKey = (source: LayoutSource, floorId: FloorId): string =>
  source.type === 'official' ? officialLayoutSwrKey(floorId) : customLayoutSwrKey(source.layoutId)

// SeatLayout はローダーが teams+seats+facilities を合成(種データ側)。
// その上に、source(公式/カスタム)に応じた保存分をlocalStorageから上書き適用する。
// 読み込みはSWRのfetcherがマウント後に実行される既存の仕組み(useCached参照)に乗せるため
// SSR不整合は起きない
export const useSeatLayout = () => {
  const { source } = useLayoutSource()
  const { announce } = useGlobalAnnouncement()
  // 公式は選択中フロア、カスタムは既定フロアの種データで合成する
  // (カスタムは保存分が本体で、合成分は保存分が見つからない時のフォールバックにしかならない)。
  // source.floorId は LayoutSource 側で FloorId 型を保証済みなので、ここでの再検証は不要(#9)
  const floorId: FloorId = source.type === 'official' ? source.floorId : DEFAULT_FLOOR_ID
  const { teams, seats, facilities, furniture } = useFloorSeed(floorId)
  // 内容が変わらない限り同一参照を返す(下流の React.memo が毎レンダー無効化されるのを防ぐ)
  const composed: SeatLayout | undefined = useMemo(
    () =>
      teams && seats && facilities && furniture
        ? {
            floorId,
            floorName: floorNameOf(floorId),
            viewBox: VIEWBOX,
            seats,
            teams,
            facilities,
            furniture,
          }
        : undefined,
    [floorId, teams, seats, facilities, furniture]
  )

  const { data: override, mutate: mutateOverride } = useSWR<SeatLayout | null>(
    layoutSwrKey(source, floorId),
    async () => {
      if (source.type === 'official') return loadStoredLayout(floorId, VALID_EMPLOYEE_IDS)
      const custom = loadCustomLayout(source.layoutId, VALID_EMPLOYEE_IDS)
      if (custom) return custom
      // カスタムの保存分が見つからない(削除済み等): 公式へフォールバックして通知する
      announce('[warning]表示中のレイアウトが見つからないため公式レイアウトを表示しています')
      return loadStoredLayout(DEFAULT_FLOOR_ID, VALID_EMPLOYEE_IDS)
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
        saveStoredLayout(floorId, next)
      } else {
        saveCustomLayout(source.layoutId, next)
        touchLayoutMetaUpdatedAt(source.layoutId)
      }
      await mutateOverride(next, false)
    },
    [source, floorId, mutateOverride]
  )

  // 設定操作「レイアウトをリセット」: 公式表示中のみ有効。保存分を削除して種データ合成分へ復帰する。
  // カスタム表示中はリセット対象が無いため no-op
  const resetLayout = useCallback(async () => {
    if (source.type !== 'official') return
    clearStoredLayout(floorId)
    await mutateOverride(null, false)
  }, [source, floorId, mutateOverride])

  return { layout, isLoading: !layout, persistLayout, resetLayout }
}
