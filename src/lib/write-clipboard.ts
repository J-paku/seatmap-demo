// クリップボードへの書き込み。useCopyField(連絡先のコピー)と useAiPrompt(AI生成プロンプトのコピー)が使う。
// 書いた文字列はページを閉じても OS 側に残るため、アプリの外との入出力として lib に置く

// 書き込みの Promise を返す。クリップボードを使えない環境では何もせず null を返す
export const writeClipboardText = (value: string): Promise<void> | null => {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return null
  return navigator.clipboard.writeText(value)
}
