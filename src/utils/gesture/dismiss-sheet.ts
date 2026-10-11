// 全領域スワイプで閉じるシート(hooks/use-swipe-to-dismiss.ts)の遊び幅と、シート要素の transform の書き換え

// 確定前の「様子見」を許容する遊び幅(px)
export const COMMIT_SLOP = 10

// 追従を解いて元位置へ戻すときの transition
export const SNAP_TRANSITION = 'transform 0.2s ease-out'

// シート要素へ命令的に transform を反映(instant=true でスナップし transition を殺す)
export function driveTransform(
  node: HTMLElement | null,
  transform: string,
  instant: boolean
): void {
  if (!node) return
  if (instant) node.style.transition = 'none'
  node.style.transform = transform
}

// 追従を打ち切り、アニメーション付きで元位置へ戻す。React の再レンダー任せにせず
// ここで DOM を確定させる — 直前のレンダーと同じ style オブジェクトになった場合
// React は書き込みを省き、命令的に書いた transform がそのまま残るため
export function releaseTransform(node: HTMLElement | null): void {
  if (!node) return
  node.style.transition = SNAP_TRANSITION
  node.style.transform = ''
}
