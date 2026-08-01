// お気に入り部署の永続化を担うユーティリティ

// お気に入り部署名を保存する LocalStorage キー
export const FAVORITE_DEPARTMENTS_STORAGE_KEY = 'seatmap-demo:favorite-departments'

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

// 部署グループ配列からお気に入り部署のみを登録順（古いものが上・新しいものが下）で抽出する。
// サイドバー（EmployeeDirectory）と検索シート（EmployeeSearchSheet）で並びを統一するための共通ヘルパー
export function orderFavoriteDepartments<T extends { dept: string }>(
  groups: T[],
  favoriteDepts: Set<string>
): T[] {
  const order = new Map(Array.from(favoriteDepts).map((dept, index) => [dept, index] as const))
  return groups
    .filter(group => favoriteDepts.has(group.dept))
    .sort((left, right) => (order.get(left.dept) ?? 0) - (order.get(right.dept) ?? 0))
}
