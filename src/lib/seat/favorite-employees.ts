// お気に入り社員の永続化と社員名解決を担うユーティリティ

// お気に入り社員 ID を保存する LocalStorage キー
const FAVORITES_STORAGE_KEY = 'seatmap-demo:favorites'

// LocalStorage からお気に入り社員 ID 集合を読み込む（失敗時は空集合）
export function readFavoriteIds(): Set<string> {
  try {
    // 未保存(getItem が null)は文字列 'null' になり、JSON の null から空集合ができる
    const stored = String(localStorage.getItem(FAVORITES_STORAGE_KEY))
    const parsed = JSON.parse(stored) as string[] | null
    return new Set(parsed)
  } catch {
    // 読み込み・パース失敗時は空集合のまま
    return new Set()
  }
}

// お気に入り社員 ID 集合を LocalStorage へ保存する
export function writeFavoriteIds(ids: Set<string>): void {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(ids)))
}
