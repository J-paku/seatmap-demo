// お気に入り社員の永続化と社員名解決を担うユーティリティ
import type { Employee } from '@/types'

// お気に入り社員 ID を保存する LocalStorage キー
export const FAVORITES_STORAGE_KEY = 'seatmap-demo:favorites'

// LocalStorage からお気に入り社員 ID 集合を読み込む（失敗時は空集合）
export function readFavoriteIds(): Set<string> {
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (!stored) return new Set()
    const parsed = JSON.parse(stored) as string[]
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

// お気に入り ID に該当する社員名リストを解決する（重複排除）
export function resolveFavoriteEmployeeNames(
  employees: Employee[],
  favoriteIds: Set<string>
): string[] {
  if (favoriteIds.size === 0) return []
  const names = employees
    .filter(employee => favoriteIds.has(employee.id))
    .map(employee => employee.name)
  return Array.from(new Set(names))
}
