// Compact セルの氏名表示ルール(Desktop はフルネームなのでこの計算を持たない)

// 姓の切り出しは lib/seat/display-utils を唯一の判定基準とする。
// 元は同名の関数がここにも別実装で存在し、あちらだけが Garoon 名の「; 所属」接尾辞を落としていた。
// 同じ概念の判定基準を2つ持たない(docs/pitfalls.md 4番)。
// モック44名で両実装の出力が完全一致することは確認済み(差は空白のみの入力で "" を返すか否か)
export { getCompactNameLabel } from '@/lib/seat/display-utils'

// 8〜13px 可変。ASCII 9 文字以上 → 8px / 和名 5 文字以上 → 12px
export const compactNameFontSize = (label: string): number => {
  if (/^[\x20-\x7e]+$/.test(label)) return label.length >= 9 ? 8 : 13
  return label.length >= 5 ? 12 : 13
}
