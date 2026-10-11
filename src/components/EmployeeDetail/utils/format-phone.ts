// 電話番号(ハイフン無し11文字)を 3-4-4 区切りで表示整形。
// モックは下4桁が 'xxxx' の伏せ字なので、数字判定はせず文字数だけで区切る
export const formatPhone = (value: string): string =>
  value.length === 11 ? `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7)}` : value
