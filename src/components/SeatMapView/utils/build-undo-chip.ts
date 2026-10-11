import type { GhostRequest } from '@/components/GhostPlacementLayer'
import type { RecentPlacement, UndoChipRequest } from '@/components/SeatMapCanvas/type'
import type { Rect } from '@/utils/layout/rect'

// 追加・削除の直後に出す「元に戻す」チップの材料(強調する対象・文言・出す位置)

// 強調するのは会議室・家具だけ。チーム枠は面が広く、破線の枠とチップで十分に見つかる
export const recentOf = (target: GhostRequest['target'], rect: Rect): RecentPlacement | null => {
  if (target.type === 'add-facility') return { kind: 'facility', rect }
  if (target.type === 'add-furniture') return { kind: 'furniture', rect }
  if (
    target.type === 'reposition' &&
    (target.ref.kind === 'facility' || target.ref.kind === 'furniture')
  ) {
    return { kind: target.ref.kind, rect }
  }
  return null
}

// 配置と掴み直しで文言を変える
export const placedMessageOf = (target: GhostRequest['target']): string =>
  target.type === 'reposition' ? '移動しました' : '配置しました'

// チップは対象の下辺中央へ出す。座標は論理(viewBox)のまま渡す
export const undoChipRequestOf = (
  rect: Rect,
  message: string,
  frame: Rect | null,
  recent: RecentPlacement | null
): UndoChipRequest => ({
  anchor: { x: rect.x + rect.w / 2, y: rect.y + rect.h },
  message,
  frame,
  recent,
})
