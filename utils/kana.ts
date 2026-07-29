// 検索用の文字列正規化。検索語・対象の双方に同一関数を適用してから部分一致する
// 1. 前後空白 trim 2. ASCII 英字を小文字化 3. ひらがな→全角カタカナ(U+3041〜U+3096 を +0x60)
export const normalizeForSearch = (input: string): string => {
  let out = ''
  for (const ch of input.trim()) {
    const code = ch.codePointAt(0) ?? 0
    if (code >= 0x3041 && code <= 0x3096) {
      out += String.fromCodePoint(code + 0x60)
    } else if (code >= 0x41 && code <= 0x5a) {
      // 大文字 ASCII → 小文字
      out += ch.toLowerCase()
    } else {
      out += ch
    }
  }
  return out
}
