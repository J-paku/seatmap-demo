// ポインターキャプチャ取得の WebKit 例外を安全に握りつぶすユーティリティ

// iOS Safari は pointerId が非アクティブな状態で setPointerCapture を呼ぶと
// NotFoundError(The object can not be found here.)を投げる。
// ドラッグ・スワイプ系ハンドラで未捕捉のまま伝播するのを防ぐためのラッパー。
export function safeSetPointerCapture(element: Element, pointerId: number): void {
  try {
    element.setPointerCapture(pointerId)
  } catch {
    // pointerId が非アクティブな場合の NotFoundError を無視
  }
}
