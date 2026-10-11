// お気に入り部署の永続化を担うユーティリティ

// お気に入り部署名を保存する LocalStorage キー
const FAVORITE_DEPARTMENTS_STORAGE_KEY = 'seatmap-demo:favorite-departments'

// LocalStorage からお気に入り部署名集合を読み込む（失敗時は空集合）
export function readFavoriteDepartments(): Set<string> {
  try {
    const stored = localStorage.getItem(FAVORITE_DEPARTMENTS_STORAGE_KEY)
    if (!stored) return new Set()
    const parsed = JSON.parse(stored) as string[]
    return new Set(parsed)
  } catch {
    // 読み込み・パース失敗時は空集合のまま
    return new Set()
  }
}

// お気に入り部署名集合を LocalStorage へ保存する
export function writeFavoriteDepartments(names: Set<string>): void {
  localStorage.setItem(FAVORITE_DEPARTMENTS_STORAGE_KEY, JSON.stringify(Array.from(names)))
}
