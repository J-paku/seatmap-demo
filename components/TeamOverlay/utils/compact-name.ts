// Compact セルの氏名表示ルール(Desktop はフルネームなのでこの計算を持たない)

// 姓のみ表示(空白区切りの先頭)
export const getCompactNameLabel = (name: string): string => {
  const head = name.trim().split(/\s+/)[0]
  return head.length > 0 ? head : name
}

// 8〜13px 可変。ASCII 9 文字以上 → 8px / 和名 5 文字以上 → 12px
export const compactNameFontSize = (label: string): number => {
  if (/^[\x20-\x7e]+$/.test(label)) return label.length >= 9 ? 8 : 13
  return label.length >= 5 ? 12 : 13
}
