// 表示系ユーティリティ（名前・時刻・座席ラベルのフォーマット）

const WHITESPACE_RE = /[\s\u3000]+/g

// コンパクト表示用に名前の先頭語を取得
export const getCompactNameLabel = (name: string) => {
  const bareName = name.split(/[;；]/)[0]?.trim() ?? ''
  if (!bareName) return ''

  const parts = bareName.split(WHITESPACE_RE).filter(Boolean)
  return parts[0] ?? bareName
}

