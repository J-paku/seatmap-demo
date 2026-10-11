// 役職名の表示整形: 末尾の区分接尾辞（（管理職）·（組合員）等の全角括弧）を除去する。
// 並び替え用の突合には原文が必要なため（EmployeeDirectoryのPOSITION_RANK_ORDER完全一致）、
// この整形は表示専用に限定して使う。
export function formatPositionLabel(position: string | null | undefined): string | null {
  if (!position) return null
  // 末尾の全角括弧区分を除去（例: 課長代理（管理職）→ 課長代理）
  const trimmed = position.replace(/（[^（）]*）\s*$/u, '').trim()
  return trimmed.length > 0 ? trimmed : null
}
