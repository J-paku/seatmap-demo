// #RRGGBB を rgba(...) 文字列へ
export const hexToRgba = (hex: string, alpha: number): string => {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// 先頭 # を省いた3桁・6桁だけを受け付ける。それ以外(桁数違い・16進以外の文字)は正規化対象外
const HEX_SHORT_DIGITS = /^[0-9a-fA-F]{3}$/
const HEX_LONG_DIGITS = /^[0-9a-fA-F]{6}$/

// HEXカラー入力の正規化(§02-2): 先頭#省略可・3桁は倍化展開・6桁は大文字化。
// 正規化できない入力は null を返す
export const normalizeHex = (input: string): string | null => {
  const digits = input.trim().replace(/^#/, '')

  if (HEX_SHORT_DIGITS.test(digits)) {
    const doubled = digits
      .split('')
      .map((c) => c + c)
      .join('')
    return `#${doubled.toUpperCase()}`
  }

  if (HEX_LONG_DIGITS.test(digits)) {
    return `#${digits.toUpperCase()}`
  }

  return null
}
