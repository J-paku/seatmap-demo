import type { Rect } from '@/utils/rect'
import type { FurnitureKind, LayoutObjectRef } from '@/types'

// 何を置こうとしているか。配置の入口(FAB・再配置ボタン)がこれを組み立て、
// ゴースト層は「どう描くか」だけを見る
type GhostTarget =
  | { type: 'add-furniture'; furnitureKind: FurnitureKind }
  | { type: 'add-facility' }
  | { type: 'add-team'; name: string; color: string }
  | { type: 'reposition'; ref: LayoutObjectRef }

// 配置セッション1回分の要求。サイズと枠線の見た目まで含めて呼び出し側が決める
export type GhostRequest = {
  target: GhostTarget
  // ヒントとアクションバーに出す対象名
  label: string
  size: { width: number; height: number }
  // リサイズの下限。会議室は座席1つ分を下回らせない
  minSize: { width: number; height: number }
  // 再配置のときの現在位置。新規配置では null
  initialRect: Rect | null
  resizable: boolean
  // チームは破線、家具・会議室は実線
  outline: 'solid' | 'dashed'
  // 再配置のとき自分自身を障害物・吸着相手から外すための参照
  selfRef: LayoutObjectRef | null
}
