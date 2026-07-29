import { useCallback, useEffect, useRef, useState } from 'react'
import type { Viewport } from '../type'
import { PULSE_DURATION_MS, PULSE_REDUCED_MS, prefersReducedMotion } from '../utils/canvas-metrics'
import type { Seat } from '@/types'
import type { Transform } from '@/utils/geometry'

// 05: ディレクトリ選択 → 座席中心へパン+ズーム → パルス強調(reduced-motion 対応)

type SeatJump = {
  pulsingSeatId: string | null
  jumpToSeat: (seat: Seat, onArrive: () => void) => void
}

export const useSeatJump = (viewport: Viewport): SeatJump => {
  const { rect, layerRef, transformRef, cancelAnim, animateTo } = viewport
  const [pulsingSeatId, setPulsingSeatId] = useState<string | null>(null)
  const pulseTimeoutRef = useRef(0)

  useEffect(() => () => window.clearTimeout(pulseTimeoutRef.current), [])

  const jumpToSeat = useCallback(
    (seat: Seat, onArrive: () => void) => {
      cancelAnim()
      const r = rect()
      if (!r || !layerRef.current) {
        onArrive()
        return
      }
      const targetScale = Math.max(transformRef.current.scale, 1)
      const target: Transform = {
        scale: targetScale,
        translateX: r.width / 2 - (seat.x + seat.width / 2) * targetScale,
        translateY: r.height / 2 - (seat.y + seat.height / 2) * targetScale,
      }

      window.clearTimeout(pulseTimeoutRef.current)
      animateTo(target, () => {
        setPulsingSeatId(seat.id)
        pulseTimeoutRef.current = window.setTimeout(
          () => setPulsingSeatId(null),
          prefersReducedMotion() ? PULSE_REDUCED_MS : PULSE_DURATION_MS
        )
        onArrive()
      })
    },
    [rect, layerRef, transformRef, cancelAnim, animateTo]
  )

  return { pulsingSeatId, jumpToSeat }
}
