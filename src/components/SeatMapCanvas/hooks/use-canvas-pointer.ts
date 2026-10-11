import { useRef } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { usePinchZoom } from './use-pinch-zoom'
import { averageVelocity, movedBeyond } from '../utils/gesture-math'
import { isModalOpen } from '../utils/canvas-metrics'
import type { Viewport } from '../type'

// 1本指のパン・タップ・慣性。2本指は usePinchZoom へ委譲する。
// 状態は全て ref に置き、追従中の再レンダーを起こさない

// 10: タップ距離閾値は仕様の8pxに合わせる(3pxだと微振動でタップが潰れる)
const TAP_DISTANCE_THRESHOLD = 8
// ダブルタップ判定
const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_DISTANCE = 40
// 慣性を開始する最低速度
const INERTIA_MIN_SPEED = 1.5
// 慣性の初速に使う直近フレーム数
const VELOCITY_SAMPLES = 4

type CanvasPointer = {
  isPanningRef: RefObject<boolean>
  handlers: {
    onPointerDown: (e: ReactPointerEvent) => void
    onPointerMove: (e: ReactPointerEvent) => void
    onPointerUp: (e: ReactPointerEvent) => void
    onClickCapture: (e: ReactMouseEvent) => void
  }
}

export const useCanvasPointer = (viewport: Viewport): CanvasPointer => {
  const { containerRef, transformRef, minScaleRef, animRef, rect, applyTransform, commitSnap, cancelAnim, startLoop, lerpZoom } =
    viewport
  const pinch = usePinchZoom(viewport)

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const panRef = useRef({ active: false, id: -1, lastX: 0, lastY: 0, startX: 0, startY: 0, moved: false })
  const velRef = useRef<Array<{ x: number; y: number; t: number }>>([])
  const lastTapRef = useRef({ t: 0, x: 0, y: 0 })
  const suppressClickRef = useRef(false)
  const isPanningRef = useRef(false)

  const onPointerDown = (e: ReactPointerEvent) => {
    if (isModalOpen()) return
    if (e.button === 2) return // 右クリック無視
    cancelAnim()
    const r = rect()
    if (!r) return
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    pointersRef.current.set(e.pointerId, { x, y })

    if (pointersRef.current.size === 2) {
      panRef.current.active = false
      const pts = [...pointersRef.current.values()]
      pinch.begin(pts[0], pts[1])
    } else if (pointersRef.current.size === 1) {
      panRef.current = { active: true, id: e.pointerId, lastX: x, lastY: y, startX: x, startY: y, moved: false }
      velRef.current = []
    }
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    const p = pointersRef.current.get(e.pointerId)
    if (!p) return
    const r = rect()
    if (!r) return
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    p.x = x
    p.y = y

    if (pinch.isActive() && pointersRef.current.size >= 2) {
      const pts = [...pointersRef.current.values()]
      pinch.update(pts[0], pts[1])
      return
    }

    if (panRef.current.active && e.pointerId === panRef.current.id) {
      const dx = x - panRef.current.lastX
      const dy = y - panRef.current.lastY
      if (!panRef.current.moved) {
        if (movedBeyond({ x: panRef.current.startX, y: panRef.current.startY }, { x, y }, TAP_DISTANCE_THRESHOLD)) {
          panRef.current.moved = true
          isPanningRef.current = true
          // ドラッグ確定時のみ capture: タップは click を実要素へ届けるため遅延取得
          containerRef.current?.setPointerCapture(e.pointerId)
        }
      }
      if (panRef.current.moved) {
        const t = transformRef.current
        applyTransform({ scale: t.scale, translateX: t.translateX + dx, translateY: t.translateY + dy })
        velRef.current.push({ x: dx, y: dy, t: Date.now() })
        if (velRef.current.length > 6) velRef.current.shift()
      }
      panRef.current.lastX = x
      panRef.current.lastY = y
    }
  }

  // ダブルタップ: 同地点でズーム済みなら元倍率へトグル、そうでなければ ×2
  const handleTap = (x: number, y: number) => {
    const now = Date.now()
    const last = lastTapRef.current
    if (now - last.t < DOUBLE_TAP_MS && !movedBeyond(last, { x, y }, DOUBLE_TAP_DISTANCE)) {
      const zoomed = transformRef.current.scale > minScaleRef.current * 1.5
      lerpZoom(zoomed ? -1 : 1, x, y)
      lastTapRef.current = { t: 0, x, y }
    } else {
      lastTapRef.current = { t: now, x, y }
    }
  }

  const endPan = () => {
    // 慣性: 直近フレームの delta 平均
    const samples = velRef.current.slice(-VELOCITY_SAMPLES)
    if (samples.length > 0) {
      const v = averageVelocity(samples)
      if (Math.hypot(v.x, v.y) >= INERTIA_MIN_SPEED) {
        animRef.current = { kind: 'inertia', vx: v.x, vy: v.y, frame: 0 }
        startLoop()
      } else {
        commitSnap()
      }
    }
    // ドラッグ後の合成クリック抑制
    suppressClickRef.current = true
    window.setTimeout(() => {
      suppressClickRef.current = false
    }, 0)
  }

  const onPointerUp = (e: ReactPointerEvent) => {
    const p = pointersRef.current.get(e.pointerId)
    pointersRef.current.delete(e.pointerId)
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // capture 未取得時は無視
    }

    if (pinch.isActive() && pointersRef.current.size < 2) {
      pinch.end()
      return
    }

    if (panRef.current.active && e.pointerId === panRef.current.id) {
      const wasMoved = panRef.current.moved
      panRef.current.active = false
      panRef.current.moved = false
      isPanningRef.current = false
      if (wasMoved) endPan()
      else if (p) handleTap(p.x, p.y)
    }
  }

  const onClickCapture = (e: ReactMouseEvent) => {
    if (suppressClickRef.current) {
      e.stopPropagation()
      e.preventDefault()
    }
  }

  return { isPanningRef, handlers: { onPointerDown, onPointerMove, onPointerUp, onClickCapture } }
}
