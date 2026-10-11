// スワイプ閉じ用: シート root の背景スクロール連鎖ガード
// 非スクロール領域（ハンドル・ヘッダー・余白）の縦 touchmove のみ preventDefault し、
// 背景キャンバスへのスクロール連鎖を物理遮断する。内部スクロール領域は素通しし native scroll を維持。
// 注意: root に touch-action:none を掛けると iOS WKWebView では touch-action の交差により
// 子孫スクロール領域まで巻き添えでスクロール不能になるため、本ガードで代替する。
import { collectScrollableAncestors } from './scrollable-ancestors'

// node へ touchstart/touchmove を登録し、解除関数を返す
export function attachSheetBackgroundGuard(node: HTMLElement): () => void {
  // タッチ起点〜node間のスクロール可能祖先（touchstartで1回算出しジェスチャー単位でキャッシュ。
  // touchmoveごとのgetComputedStyleによる強制スタイル再計算を避ける）
  let touchScrollables: HTMLElement[] = []
  // タッチ開始座標（縦横の方向判定用）
  let touchStartX = 0
  let touchStartY = 0

  const handleTouchStart = (e: TouchEvent) => {
    // マルチタッチ（ピンチ等）は対象外
    if (e.touches.length !== 1) return
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY
    touchScrollables = collectScrollableAncestors(e.target, node)
  }

  const handleTouchMove = (e: TouchEvent) => {
    // マルチタッチ（ピンチ等）は対象外
    if (e.touches.length !== 1) return
    // 横優勢ジェスチャーは背景への縦 pan 連鎖と無関係 → 素通し。
    // preventDefault すると子孫の横スクロール（座席グリッド等）のネイティブパンごと殺してしまう
    const deltaX = e.touches[0].clientX - touchStartX
    const deltaY = e.touches[0].clientY - touchStartY
    if (Math.abs(deltaX) > Math.abs(deltaY)) return
    // タッチ地点から node までに「その向きへ実際にスクロール余地のある」要素が挟まる時だけ
    // native scroll を優先する。容量(scrollHeight>clientHeight)だけで判定すると、最上端で
    // 下へ引く閉じジェスチャーまで譲ってしまい、ブラウザがスクロールを先取りして
    // pointercancel を発火 → スワイプ閉じが実機で一切効かなくなる(scrollTop は
    // ジェスチャー中に変わるためキャッシュせず毎回ライブに読む)
    for (const el of touchScrollables) {
      const hasRoom =
        deltaY > 0
          ? el.scrollTop > 1 // 下方向ドラッグ = 上へ戻る余地(iOS の残留小数は 1px 許容)
          : el.scrollTop + el.clientHeight < el.scrollHeight - 1 // 上方向ドラッグ = 下へ進む余地
      if (hasRoom) return
    }
    // 慣性スクロール中は cancelable=false となり preventDefault が無視される（警告も出る）
    if (!e.cancelable) return
    // スクロール領域外（ハンドル・ヘッダー・余白）: 背景への pan 連鎖を遮断
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
