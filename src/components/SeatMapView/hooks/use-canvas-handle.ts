import { useCallback, useRef } from 'react'
import type { RefObject } from 'react'
import { placedMessageOf, recentOf, undoChipRequestOf } from '../utils/build-undo-chip'
import type { GhostRequest } from '@/components/GhostPlacementLayer'
import type { SeatMapCanvasHandle } from '@/components/SeatMapCanvas'
import type { RecentPlacement } from '@/components/SeatMapCanvas/type'
import type { Rect } from '@/utils/layout/rect'

// キャンバスの ref と、その ref 越しに頼む命令(「元に戻す」チップ・対象の中央寄せ)。
// 配置フローも操作ガイドもキャンバスの外に居るので、変換を持つキャンバス側へここから頼む

export type ShowUndoChipAt = (
  rect: Rect,
  message: string,
  frame?: Rect | null,
  recent?: RecentPlacement | null
) => void

type CanvasHandle = {
  canvasRef: RefObject<SeatMapCanvasHandle | null>
  showUndoChipAt: ShowUndoChipAt
  handlePlaced: (rect: Rect, target: GhostRequest['target']) => void
  centerOnSelector: (selector: string) => void
}

export const useCanvasHandle = (): CanvasHandle => {
  const canvasRef = useRef<SeatMapCanvasHandle>(null)

  // 追加・削除の直後は対象の直下へ「元に戻す」チップを出す。
  // 座標は論理(viewBox)のまま渡す — 画面座標への投影はチップ側が毎フレーム行い、
  // 表示中にパン・ズームしても対象の下辺に貼り付いたまま追従する
  const showUndoChipAt = useCallback(
    (
      rect: Rect,
      message: string,
      frame: Rect | null = null,
      recent: RecentPlacement | null = null
    ) => {
      canvasRef.current?.showUndoChipAt(undoChipRequestOf(rect, message, frame, recent))
    },
    []
  )

  // 配置と掴み直しで文言を変える。対象の種別は配置フロー側だけが知っている
  const handlePlaced = useCallback(
    (rect: Rect, target: GhostRequest['target']) => {
      showUndoChipAt(rect, placedMessageOf(target), null, recentOf(target, rect))
    },
    [showUndoChipAt]
  )

  const centerOnSelector = useCallback(
    (selector: string) => canvasRef.current?.centerOnSelector(selector),
    []
  )

  return { canvasRef, showUndoChipAt, handlePlaced, centerOnSelector }
}
