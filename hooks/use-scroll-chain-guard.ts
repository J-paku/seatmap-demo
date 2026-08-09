// スクロール領域の端での過剰スワイプが親へ伝播するスクロールチェーンを物理的に遮断するフック
// iOS WKWebView は overscroll-behavior:contain を完全サポートしないため、
// touchmove を passive:false で監視し端到達時に preventDefault する
import { useCallback, useRef } from 'react'
import { collectScrollableAncestors } from '@/utils/gesture/scrollable-ancestors'

interface ScrollChainGuardReturn {
  // スクロール可能領域に spread する props（callback ref を内包）
  // div / ul など任意の要素に対応するため HTMLElement で受ける
  scrollContainerProps: {
    ref: React.RefCallback<HTMLElement>
  }
}

export function useScrollChainGuard(): ScrollChainGuardReturn {
  // 直近に登録したネイティブリスナーの解除関数を保持
  const cleanupRef = useRef<(() => void) | null>(null)
  // タッチ開始時の座標（縦横の方向判定用）
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  // タッチ起点〜本要素間のスクロール可能祖先（touchstartで1回算出しジェスチャー単位でキャッシュ。
  // touchmoveごとのgetComputedStyleによる強制スタイル再計算を避ける）
  const innerScrollablesRef = useRef<HTMLElement[]>([])

  const ref = useCallback((node: HTMLElement | null) => {
    // 既存ノードのリスナーを先に解除
    cleanupRef.current?.()
    cleanupRef.current = null

    if (!node) return

    const handleTouchStart = (e: TouchEvent) => {
      // マルチタッチ（ピンチ等）は対象外
      if (e.touches.length !== 1) return
      startXRef.current = e.touches[0].clientX
      startYRef.current = e.touches[0].clientY
      innerScrollablesRef.current = collectScrollableAncestors(e.target, node)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return

      // 正=下方向スワイプ（上端へ引く） / 負=上方向スワイプ（下端へ送る）
      const deltaY = e.touches[0].clientY - startYRef.current
      const deltaX = e.touches[0].clientX - startXRef.current

      // 横優勢ジェスチャーは縦スクロールチェーンと無関係 → 素通し。
      // preventDefault すると子孫の横スクロール（座席グリッド等）のネイティブパンごと殺してしまう
      if (Math.abs(deltaX) > Math.abs(deltaY)) return

      // ネストしたスクロール領域からバブルしたtouchmoveを本要素の端判定でpreventDefaultすると、
      // 内側リストのネイティブスクロールごと殺してしまう
      // （例: DetailPanel内スケジュール300pxリスト — 本要素が最下端のとき
      //  指を上へ＝リストを下へ送る操作だけが死に、片方向スクロール不能になる）。
      // タッチ起点から本要素までの間に当該方向へまだスクロール可能な要素があれば素通しする。
      // 祖先チェーンはtouchstartでキャッシュ済み（touchのtargetは開始要素に固定される）。
      // スクロール余地はジェスチャー中に変わるため毎回ライブに判定する。
      for (const inner of innerScrollablesRef.current) {
        if (inner.scrollHeight <= inner.clientHeight + 1) continue
        const canScrollUp = inner.scrollTop > 0
        const canScrollDown = inner.scrollTop + inner.clientHeight < inner.scrollHeight - 1
        if ((deltaY > 0 && canScrollUp) || (deltaY < 0 && canScrollDown)) return
      }

      // 慣性スクロール中の touchmove は cancelable=false になり preventDefault が
      // ブラウザ Intervention で無視される（コンソール警告も出る）。cancelable のみ遮断する
      if (!e.cancelable) return

      const { scrollTop, scrollHeight, clientHeight } = node
      // コンテンツが収まりスクロール不可な要素では何もしない(素通し)。
      // ここで preventDefault すると、レイアウト計測タイミングや flex 構成次第で
      // 本来スクロール可能な要素の入力まで巻き添えで殺す事故が起きる(nippou で実測)。
      // 背景への連鎖は body スクロールロック + シート root ガードが別途担うため不要。
      if (scrollHeight <= clientHeight) return

      const atTop = scrollTop <= 0
      // 端判定の 1px 余裕でサブピクセル誤差を吸収
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1

      // 端に到達後さらに同方向へ引く場合のみ親伝播を遮断
      if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
        e.preventDefault()
      }
    }

    // React 合成イベントは passive 登録で preventDefault が無視されるため passive:false で登録
    node.addEventListener('touchstart', handleTouchStart, { passive: true })
    node.addEventListener('touchmove', handleTouchMove, { passive: false })

    cleanupRef.current = () => {
      node.removeEventListener('touchstart', handleTouchStart)
      node.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  return {
    scrollContainerProps: { ref },
  }
}
