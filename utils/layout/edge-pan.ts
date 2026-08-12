// ドラッグ中の画面端自動パン(ゴースト移動・編集ドラッグ共用)の純計算。
// ポインタがキャンバス端のゾーンへ入ったら、キャンバス側を反対方向へ滑らせて
// 「1回のドラッグでは今見えている範囲にしか動かせない」制限を外す。
// rAF 駆動は hooks/use-edge-auto-pan、変換への適用は SeatMapCanvas の
// useViewportInput が受け持つ(ゴースト層がキャンバスの DOM 木の外にいるため)

export const EDGE_PAN_EVENT = 'seatmap:edge-pan'
export const EDGE_PAN_END_EVENT = 'seatmap:edge-pan-end'

export type EdgePanDelta = { dx: number; dy: number }

// 端からこの距離(px)以内で自動パンが始まる
const ZONE_PX = 56
// 端に密着した(ゾーンを突き抜けた)ときの最大速度(px/フレーム)
const MAX_SPEED_PX = 18

// ポインタと矩形から1フレームぶんの平行移動量を出す。ゾーン外なら null。
// 端に近いほど速い(線形)。ポインタが右端 → コンテンツは左へ動く = dx は負
export const edgePanDelta = (
  pointer: { x: number; y: number },
  rect: { left: number; top: number; right: number; bottom: number }
): EdgePanDelta | null => {
  const speed = (depth: number) => Math.min(depth / ZONE_PX, 1) * MAX_SPEED_PX
  const fromLeft = ZONE_PX - (pointer.x - rect.left)
  const fromRight = ZONE_PX - (rect.right - pointer.x)
  const fromTop = ZONE_PX - (pointer.y - rect.top)
  const fromBottom = ZONE_PX - (rect.bottom - pointer.y)
  const dx = fromLeft > 0 ? speed(fromLeft) : fromRight > 0 ? -speed(fromRight) : 0
  const dy = fromTop > 0 ? speed(fromTop) : fromBottom > 0 ? -speed(fromBottom) : 0
  if (dx === 0 && dy === 0) return null
  return { dx, dy }
}
