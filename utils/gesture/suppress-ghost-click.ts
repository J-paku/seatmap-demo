// タッチ由来の合成 click が背面要素へ貫通するのを 1 回だけ抑止するユーティリティ

// 合成 click が発生しなかった場合にリスナーを解除するまでの猶予（ms）
const GHOST_CLICK_WINDOW_MS = 350

// bottom sheet をタップ／スワイプで閉じた直後、touchend 由来の合成 click が
// 背面ノードへ貫通して即再オープンするループを防ぐ。
// 次の click を capture 段階で 1 回だけ握りつぶし、背面の onClick へ到達させない。
export function suppressGhostClick(): void {
  const cleanup = () => {
    document.removeEventListener('click', onClick, true)
    window.clearTimeout(timer)
  }
  const onClick = (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    cleanup()
  }
  document.addEventListener('click', onClick, true)
  const timer = window.setTimeout(cleanup, GHOST_CLICK_WINDOW_MS)
}
