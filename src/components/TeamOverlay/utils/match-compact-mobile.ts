// useIsCompactMobile(TeamOverlay のモバイル表示判定)が購読するメディアクエリ

// TeamOverlay の唯一の分岐スイッチ。pointerType やタッチ有無は見ず幅だけで決めるため、
// ウィンドウを狭めた PC も完全にモバイル表示になる
export const COMPACT_MOBILE_QUERY = '(max-width: 760px)'
