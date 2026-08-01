// 横ジェスチャー領域用: 軸ロック touchmove ガード
// touch-action: pan-y の要素上で斜め成分を含む横スワイプを行うと、ブラウザの縦 native scroll が
// 同時に走り干渉する(カードフリップ中に画面が上下へ動く)。ジェスチャー初動で縦横優勢を
// 1回だけ判定し、横ロック時は以降の touchmove を全て preventDefault して縦スクロールを遮断する。
// 縦ロック時は無介入(native scroll 維持)。touch-action: none と違い縦スクロール起点としての
// 機能を殺さないのが利点。

// 軸確定までの遊び幅(px)。小さいほど早期ロックだが誤判定しやすい
const LOCK_SLOP = 8

// node へ touchstart/touchmove を登録し、解除関数を返す
export function attachAxisLockTouchGuard(node: HTMLElement): () => void {
  // タッチ開始座標(軸判定用)
  let startX = 0
  let startY = 0
  // 'h'=横ロック(preventDefault 継続) / 'v'=縦ロック(無介入) / null=未確定
  let lockedAxis: 'h' | 'v' | null = null

  const handleTouchStart = (e: TouchEvent) => {
    // マルチタッチ(ピンチ等)は対象外
    if (e.touches.length !== 1) return
    startX = e.touches[0].clientX
    startY = e.touches[0].clientY
    lockedAxis = null
  }

  const handleTouchMove = (e: TouchEvent) => {
    // マルチタッチ(ピンチ等)は対象外
    if (e.touches.length !== 1) return
    if (lockedAxis === null) {
      const dx = Math.abs(e.touches[0].clientX - startX)
      const dy = Math.abs(e.touches[0].clientY - startY)
      // 遊び幅内は未確定のまま様子見(タップ・微小移動を誤ロックしない)
      if (Math.max(dx, dy) < LOCK_SLOP) return
      lockedAxis = dx > dy ? 'h' : 'v'
    }
    if (lockedAxis !== 'h') return
    // 慣性スクロール中は cancelable=false となり preventDefault が無視される
    if (!e.cancelable) return
    e.preventDefault()
  }

  // React 合成イベントは passive 登録で preventDefault が無視されるため passive:false で登録
  node.addEventListener('touchstart', handleTouchStart, { passive: true })
  node.addEventListener('touchmove', handleTouchMove, { passive: false })

  return () => {
    node.removeEventListener('touchstart', handleTouchStart)
    node.removeEventListener('touchmove', handleTouchMove)
  }
}
