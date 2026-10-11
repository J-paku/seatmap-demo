// 表示系ユーティリティ（名前・時刻・座席ラベルのフォーマット）

// 語の区切り(半角・全角の空白)
const WHITESPACE_RE = /[\s　]/

// コンパクト表示用に名前の先頭語を取得
// セミコロン(半角/全角)より前を前後の空白を除いて取り、その最初の語を返す。何も無ければ空文字
// (split は必ず1要素以上を返すので [0] は常に文字列。前後の空白を除いた後なので最初の語は空白で始まらない)
export const getCompactNameLabel = (name: string) =>
  name.split(/[;；]/)[0].trim().split(WHITESPACE_RE)[0]
