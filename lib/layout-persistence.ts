// 07-admin-edit: 編集レイアウトのlocalStorage永続化(原本のサーバ保存をデモ用に代替)
// 「保存処理」自体はこのファイルに閉じ、mock-loaderのSWRキャッシュ連携から呼び出す
import type { SeatLayout } from '@/types'

// 仕様書07明記のキー
export const LAYOUT_STORAGE_KEY = 'seatmap-demo/layout'

// 保存済みレイアウトを読み込む。パース失敗時は保存分を破棄してnullを返す(呼び出し側は種データにフォールバック)
export const loadStoredLayout = (): SeatLayout | null => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SeatLayout
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
