import { useRef } from 'react'
import { pinchGeometry } from '../utils/gesture-math'
import type { Point } from '../utils/gesture-math'
import type { Viewport } from '../type'
import { MAX_SCALE, clamp, scaleToLevel, toLogical } from '@/utils/layout/geometry'

// 2本指のピンチズーム。バウンス範囲まで許容し、離した時に上下限へスプリング復元する

// 2本指タップとみなす接触時間と倍率変動
const TAP_MS = 250
const TAP_LEVEL = 0.07
// バウンスで許容する上下限の緩め幅
const OVERSCROLL_LOW = 0.8
const OVERSCROLL_HIGH = 1.2

type PinchZoom = {
  isActive: () => boolean
  begin: (a: Point, b: Point) => void
  update: (a: Point, b: Point) => void
  end: () => void
}

export const usePinchZoom = (viewport: Viewport): PinchZoom => {
  const { transformRef, minScaleRef, animRef, applyTransform, commitSnap, startLoop, lerpZoom } = viewport
  const pinch = useRef({ active: false, startDist: 0, startScale: 1, startTime: 0, alx: 0, aly: 0, midX: 0, midY: 0 })

  return {
    isActive: () => pinch.current.active,

    begin: (a, b) => {
      const { midX, midY, dist } = pinchGeometry(a, b)
      const t = transformRef.current
      pinch.current = {
        active: true,
        startDist: dist,
        startScale: t.scale,
        startTime: Date.now(),
        alx: toLogical(midX, t.scale, t.translateX),
        aly: toLogical(midY, t.scale, t.translateY),
        midX,
        midY,
      }
    },

    update: (a, b) => {
      const { midX, midY, dist } = pinchGeometry(a, b)
      const raw = pinch.current.startScale * (dist / pinch.current.startDist)
      const s = clamp(raw, minScaleRef.current * OVERSCROLL_LOW, MAX_SCALE * OVERSCROLL_HIGH)
      pinch.current.midX = midX
      pinch.current.midY = midY
      applyTransform(
        { scale: s, translateX: midX - pinch.current.alx * s, translateY: midY - pinch.current.aly * s },
        true
      )
    },

    end: () => {
      const t = transformRef.current
      const { startTime, startScale, midX, midY, alx, aly } = pinch.current
      pinch.current.active = false
      // 2本指タップ: 接触≤250ms かつ log2 変動≤0.07 → −1レベル
      if (Date.now() - startTime <= TAP_MS && Math.abs(scaleToLevel(t.scale) - scaleToLevel(startScale)) <= TAP_LEVEL) {
        lerpZoom(-1, midX, midY)
        return
      }
      // 上下限超過 → スプリング復元
      if (t.scale < minScaleRef.current || t.scale > MAX_SCALE) {
        animRef.current = {
          kind: 'bounce',
          limit: t.scale < minScaleRef.current ? minScaleRef.current : MAX_SCALE,
          ax: midX,
          ay: midY,
          alx,
          aly,
        }
        startLoop()
      } else {
        commitSnap()
      }
    },
  }
}
