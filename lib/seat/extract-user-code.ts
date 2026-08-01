// ログインID文字列から4桁の社員番号を抽出する純粋ユーティリティ (Garoon username / Pleasanter LoginId 共通規則)
export function extractUserCode(loginId: string): string | null {
  if (/^\d{4}$/.test(loginId)) {
    return loginId
  }

  const matchedCode = loginId.match(/\d{4}$/)
  return matchedCode ? matchedCode[0] : null
}
