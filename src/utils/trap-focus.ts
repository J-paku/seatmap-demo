// Tab 循環フォーカストラップ(hooks/use-focus-trap.ts)が巡回する要素の選び方
// リンク・非無効ボタン・非無効入力欄・テキストエリア・セレクト・明示 tabindex を対象とする最も広い定義
export const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])'
