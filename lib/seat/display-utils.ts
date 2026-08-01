// 表示系ユーティリティ（名前・時刻・座席ラベルのフォーマット）

const WHITESPACE_RE = /[\s\u3000]+/g

// 全角スペースも含む空白を除去して名前を正規化
// Garoonのname末尾には所属表記（例: 山田 太郎; (6600) サイバー事業部）が付くため、
// 座席側のbare nameとマッチさせる前にsuffixを除去する
export const normalizeName = (name: string) => name.split(/[;；]/)[0].replace(WHITESPACE_RE, '')

// コンパクト表示用に名前の先頭語を取得
export const getCompactNameLabel = (name: string) => {
  const bareName = name.split(/[;；]/)[0]?.trim() ?? ''
  if (!bareName) return ''

  const parts = bareName.split(WHITESPACE_RE).filter(Boolean)
  return parts[0] ?? bareName
}

