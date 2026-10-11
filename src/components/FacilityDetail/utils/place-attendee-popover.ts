import type { AttendeePopoverState } from '../type'

// 実測定数。アンカーとの隙間と画面端の余白
const GAP_PX = 4
const EDGE_MARGIN_PX = 16
// 下方の空きがこれ未満なら上向きへ反転する
const FLIP_THRESHOLD_PX = 200
const MIN_HEIGHT_PX = 120
const MIN_RIGHT_PX = 8
const MIN_WIDTH_PX = 180
const MAX_WIDTH_PX = 320
const NARROW_VIEWPORT_PX = 640
const FLIPPED_TOP_MARGIN_PX = 20
// ボタンから離れてから閉じるまでの猶予。ポップオーバーへマウスを移す間を作る
export const CLOSE_DELAY_MS = 150

// アンカー矩形から配置を求める。常に右端そろえで左へ展開する
export const measure = (
  meetingId: string,
  rect: DOMRect,
  isSticky: boolean
): AttendeePopoverState => {
  const spaceBelow = window.innerHeight - (rect.bottom + GAP_PX) - EDGE_MARGIN_PX
  const flipped = spaceBelow < FLIP_THRESHOLD_PX
  const narrowWidth = Math.min(Math.max(MIN_WIDTH_PX, rect.right - MIN_RIGHT_PX), MAX_WIDTH_PX)

  return {
    meetingId,
    top: flipped ? rect.top - GAP_PX : rect.bottom + GAP_PX,
    right: Math.max(MIN_RIGHT_PX, window.innerWidth - rect.right),
    flipped,
    availableHeight: Math.max(
      flipped ? rect.top - FLIPPED_TOP_MARGIN_PX : spaceBelow,
      MIN_HEIGHT_PX
    ),
    maxWidthPx: window.innerWidth < NARROW_VIEWPORT_PX ? narrowWidth : MAX_WIDTH_PX,
    isSticky,
  }
}
