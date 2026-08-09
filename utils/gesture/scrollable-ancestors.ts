// タッチ起点から境界要素までの祖先チェーンにある縦スクロール可能要素を収集する
// touchmoveごとのgetComputedStyle（強制スタイル再計算）を避けるため、
// touchstart時に1回だけ呼び、結果をジェスチャー単位でキャッシュする用途。
// touchイベントのtargetは開始要素に固定されるため、ジェスチャー中にチェーンは変化しない。
// サイズ（scrollHeight/clientHeight/scrollTop）はジェスチャー中に変わり得るため、
// ここではoverflowYスタイルのみで判定し、スクロール余地の判定は呼び出し側が毎回ライブに行う。
export function collectScrollableAncestors(
  start: EventTarget | null,
  boundary: HTMLElement
): HTMLElement[] {
  const found: HTMLElement[] = []
  let el: Element | null = start instanceof Element ? start : null
  while (el && el !== boundary) {
    if (el instanceof HTMLElement) {
      const style = window.getComputedStyle(el)
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        found.push(el)
      }
    }
    el = el.parentElement
  }
  return found
}
