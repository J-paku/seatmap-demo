import { useCallback, useImperativeHandle } from 'react'
import type { ForwardedRef } from 'react'
import { buildTeamSelector } from '../utils/build-team-selector'
import { centerOnTarget } from '../utils/center-on-target'
import type { SeatMapCanvasHandle, UndoChipRequest, Viewport } from '../type'

// 親が ref 経由で呼ぶキャンバスの命令(チーム箱の実測・中央寄せ・元に戻すチップ)を公開する

export const useCanvasHandle = (
  ref: ForwardedRef<SeatMapCanvasHandle>,
  viewport: Viewport,
  showUndoChipAt: (request: UndoChipRequest) => void
): void => {
  // 検索ヒット経由でオーバーレイを開く際の拡大原点。チーム箱は画面外でも常に描画されているため
  // キャンバスを動かさずに実測できる(data-team-id の値は Team.idPrefix)
  const measureTeamRect = useCallback(
    (idPrefix: string): DOMRect | null => {
      const el = viewport.containerRef.current?.querySelector(buildTeamSelector(idPrefix))
      return el ? el.getBoundingClientRect() : null
    },
    [viewport.containerRef]
  )

  // コーチマークの対象を画面中央へ寄せる。倍率は変えず平行移動だけで合わせる
  const centerOnSelector = useCallback(
    (selector: string) => {
      const container = viewport.containerRef.current
      const el = container?.querySelector(selector)
      if (!container || !el) return
      const canvas = container.getBoundingClientRect()
      const target = el.getBoundingClientRect()
      viewport.animateTo(centerOnTarget(canvas, target, viewport.transformRef.current))
    },
    [viewport]
  )

  useImperativeHandle(ref, () => ({ measureTeamRect, showUndoChipAt, centerOnSelector }), [
    measureTeamRect,
    showUndoChipAt,
    centerOnSelector,
  ])
}
