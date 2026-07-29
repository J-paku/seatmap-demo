import { useCallback, useMemo } from 'react'
import type { Viewport } from '../type'
import { computeCompact } from '@/utils/geometry'

// ズームボタン用のコマンド。変換の基点はコンテナ中央で固定する

type ZoomControls = {
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
}

export const useZoomControls = (viewport: Viewport): ZoomControls => {
  const { rect, cancelAnim, lerpZoom, animateTo } = viewport

  const zoomBy = useCallback(
    (delta: number) => {
      const r = rect()
      if (!r) return
      cancelAnim()
      lerpZoom(delta, r.width / 2, r.height / 2)
    },
    [rect, cancelAnim, lerpZoom]
  )

  const reset = useCallback(() => {
    cancelAnim()
    const r = rect()
    if (!r) return
    animateTo(computeCompact(r.width, r.height))
  }, [rect, cancelAnim, animateTo])

  return useMemo(() => ({ zoomIn: () => zoomBy(1), zoomOut: () => zoomBy(-1), reset }), [zoomBy, reset])
}
