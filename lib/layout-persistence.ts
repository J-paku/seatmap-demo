// 07-admin-edit: 編集レイアウトのlocalStorage永続化(原本のサーバ保存をデモ用に代替)
// 「保存処理」自体はこのファイルに閉じ、mock-loaderのSWRキャッシュ連携から呼び出す
import type { SeatLayout } from '@/types'

// 仕様書07明記のキー
const LAYOUT_STORAGE_KEY = 'seatmap-demo/layout'

// 保存済みレイアウトを読み込む。パース失敗時は保存分を破棄してnullを返す(呼び出し側は種データにフォールバック)。
//
// 配列フィールドを増やしたとき、既に保存済みの古いレイアウトにはそのキーが無い。
// ここは localStorage を読む唯一の口なので、既定値の穴埋めもここだけで行う。
// 利用側へ散らすと、書き足し忘れた1箇所が「古い保存分を持つ利用者だけクラッシュする」
// 再現困難な不具合になる(新しいブラウザでは決して再現しない)
export const loadStoredLayout = (): SeatLayout | null => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SeatLayout
    return { ...parsed, furniture: parsed.furniture ?? [] }
  } catch {
    window.localStorage.removeItem(LAYOUT_STORAGE_KEY)
    return null
  }
}

// 編集結果のSeatLayout全体をJSONで保存する
export const saveStoredLayout = (layout: SeatLayout): void => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout))
}

// 保存分を削除する(設定操作「レイアウトをリセット」から呼び出し、種データへ復帰させる)
export const clearStoredLayout = (): void => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(LAYOUT_STORAGE_KEY)
}
