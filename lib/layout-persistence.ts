// 07-admin-edit: 編集レイアウトのlocalStorage永続化(原本のサーバ保存をデモ用に代替)
// 「保存処理」自体はこのファイルに閉じ、mock-loaderのSWRキャッシュ連携から呼び出す
import { DEFAULT_FLOOR_ID } from '@/utils/floors'
import type { FloorId, LayoutMeta, Seat, SeatLayout } from '@/types'

// 仕様書07明記のキー(公式・本社1Fの編集保存分。既存利用者の保存分を生かすためキー名は変えない)
const LAYOUT_STORAGE_KEY = 'seatmap-demo/layout'
// STEP1: 複数レイアウト対応 — カスタムレイアウトのメタ一覧(LayoutMeta[])
const LAYOUT_METAS_KEY = 'seatmap-demo/layouts'
// STEP1: 起動時に開くレイアウトのid
const DEFAULT_LAYOUT_ID_KEY = 'seatmap-demo/default-layout'

// カスタムレイアウト1件のペイロードキー。公式キーの名前空間をそのまま延長する
const customLayoutKey = (layoutId: string): string => `${LAYOUT_STORAGE_KEY}:${layoutId}`

// STEP2: 公式レイアウトの保存キーをフロアごとに分ける。既定フロア(floor-1)だけは
// 既に編集分を持つブラウザから読めなくなるため従来キーのまま、追加フロアだけ末尾にidを足す。
// 区切りは '/' にしてカスタム側(':')と名前空間が混ざらないようにする
const officialLayoutKey = (floorId: FloorId): string =>
  floorId === DEFAULT_FLOOR_ID ? LAYOUT_STORAGE_KEY : `${LAYOUT_STORAGE_KEY}/${floorId}`

// 実在しない社員を指す Seat.employeeId(宙ぶらりんの参照)を null へ戻す。座席そのものは残す
// (壊れているのは参照だけで、配置は利用者が編集した資産のため)。
//
// 着席判定は utils/seat-occupancy.ts へ一本化済みだが、判定を直しても localStorage に
// 書かれた値は古いままで、次に保存し直した時にまた同じidが書き戻る。既定値の穴埋めと同じく
// ここが localStorage を読む唯一の口なので、この解消もここだけで行う。利用側へ散らすと、
// 書き足し忘れた1箇所が「古い保存分を持つ利用者だけ着席数が合わない」再現困難な不具合になる
// (新しいブラウザでは決して再現しない)。
//
// 有効な社員id集合を引数で受けるのは、ここから社員データ(lib/mock-loader.ts)を import すると
// 循環参照になるため(mock-loader 側が既にこのファイルを import している)
const pruneDanglingEmployeeIds = (seats: Seat[], validEmployeeIds: ReadonlySet<string>): Seat[] =>
  seats.map((seat) =>
    seat.employeeId !== null && !validEmployeeIds.has(seat.employeeId)
      ? { ...seat, employeeId: null }
      : seat
  )

// 保存済みレイアウトを読み込む。パース失敗時は保存分を破棄してnullを返す(呼び出し側は種データにフォールバック)。
//
// 配列フィールドを増やしたとき、既に保存済みの古いレイアウトにはそのキーが無い。
// ここは localStorage を読む唯一の口なので、既定値の穴埋めもここだけで行う。
// 利用側へ散らすと、書き足し忘れた1箇所が「古い保存分を持つ利用者だけクラッシュする」
// 再現困難な不具合になる(新しいブラウザでは決して再現しない)
export const loadStoredLayout = (
  floorId: FloorId,
  validEmployeeIds: ReadonlySet<string>
): SeatLayout | null => {
  if (typeof window === 'undefined') return null
  const key = officialLayoutKey(floorId)
  const raw = window.localStorage.getItem(key)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SeatLayout
    // seats が配列でない古い/壊れた保存分でも落ちないよう、配列と確認できた時だけ整える
    return {
      ...parsed,
      furniture: parsed.furniture ?? [],
      seats: Array.isArray(parsed.seats)
        ? pruneDanglingEmployeeIds(parsed.seats, validEmployeeIds)
        : parsed.seats,
    }
  } catch {
    window.localStorage.removeItem(key)
    return null
  }
}

// 編集結果のSeatLayout全体をJSONで保存する
export const saveStoredLayout = (floorId: FloorId, layout: SeatLayout): void => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(officialLayoutKey(floorId), JSON.stringify(layout))
}

// 保存分を削除する(設定操作「レイアウトをリセット」から呼び出し、種データへ復帰させる)
export const clearStoredLayout = (floorId: FloorId): void => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(officialLayoutKey(floorId))
}

// STEP1: カスタムレイアウトのメタ一覧を読み込む。壊れていれば空配列を返しキーごと削除する
export const loadLayoutMetas = (): LayoutMeta[] => {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(LAYOUT_METAS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as LayoutMeta[]
    if (!Array.isArray(parsed)) throw new Error('layouts is not an array')
    return parsed
  } catch {
    window.localStorage.removeItem(LAYOUT_METAS_KEY)
    return []
  }
}

// メタ一覧をJSONで保存する
export const saveLayoutMetas = (metas: LayoutMeta[]): void => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LAYOUT_METAS_KEY, JSON.stringify(metas))
}

// カスタムレイアウト1件を読み込む。loadStoredLayoutと同じ既定値の穴埋め・防御を行う
export const loadCustomLayout = (
  layoutId: string,
  validEmployeeIds: ReadonlySet<string>
): SeatLayout | null => {
  if (typeof window === 'undefined') return null
  const key = customLayoutKey(layoutId)
  const raw = window.localStorage.getItem(key)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SeatLayout
    return {
      ...parsed,
      furniture: parsed.furniture ?? [],
      seats: Array.isArray(parsed.seats)
        ? pruneDanglingEmployeeIds(parsed.seats, validEmployeeIds)
        : parsed.seats,
    }
  } catch {
    window.localStorage.removeItem(key)
    return null
  }
}

// カスタムレイアウト1件をJSONで保存する
export const saveCustomLayout = (layoutId: string, layout: SeatLayout): void => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(customLayoutKey(layoutId), JSON.stringify(layout))
}

// カスタムレイアウトを削除する。メタ一覧からもエントリを外し、ペイロードキーも消して
// 孤児(メタだけ残る/ペイロードだけ残る)を残さない
export const deleteCustomLayout = (layoutId: string): void => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(customLayoutKey(layoutId))
  saveLayoutMetas(loadLayoutMetas().filter((meta) => meta.layoutId !== layoutId))
}

// 起動時に開くレイアウトのidを読み込む。JSONではない生文字列キーなのでパース失敗は起きない
export const loadDefaultLayoutId = (): string | null => {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(DEFAULT_LAYOUT_ID_KEY)
}

// 起動時に開くレイアウトのidを保存する。nullを渡すとキーを削除して既定へ戻す
export const saveDefaultLayoutId = (id: string | null): void => {
  if (typeof window === 'undefined') return
  if (id === null) {
    window.localStorage.removeItem(DEFAULT_LAYOUT_ID_KEY)
    return
  }
  window.localStorage.setItem(DEFAULT_LAYOUT_ID_KEY, id)
}
