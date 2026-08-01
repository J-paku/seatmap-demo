// スワイプ閉じ用: スクロールゲート判定
// 内部スクロールが上端以外にいる間は閉じジェスチャーへコミットさせない為の純粋DOM述語

// 要素が「スクロール可能かつ上端でない」状態かを判定
// scrollTop は iOS のモメンタムスクロール後に 0.x の小数が残留するため、
// 整数 0 比較だと視覚的最上端でもゲートが立ち続ける → 1px の許容幅で判定する
export function isScrollGateBlocking(el: Element): boolean {
  const style = window.getComputedStyle(el)
  const canScroll =
    el.scrollHeight > el.clientHeight + 1 &&
    (style.overflowY === 'auto' || style.overflowY === 'scroll')
  return canScroll && el.scrollTop > 1
}

// target から currentTarget まで祖先チェーンを遡り、
// スクロール途中の要素が挟まっていればゲートを立てる
export function computeScrollGate(
  target: EventTarget | null,
  currentTarget: EventTarget | null
): boolean {
  if (!(currentTarget instanceof Element)) return false
  let node: Element | null = target instanceof Element ? target : null
  while (node) {
    if (isScrollGateBlocking(node)) return true
    if (node === currentTarget) break
    node = node.parentElement
  }
  return false
}
