import { useRef } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react'
import type { Viewport } from './use-viewport'
import { isModalOpen } from '../utils/canvas-metrics'
import { MAX_SCALE, clamp, scaleToLevel, toLogical } from '@/utils/geometry'

// パン・ピンチ・ダブルタップ・慣性。状態は全て ref に置き、追従中の再レンダーを起こさない

// 10: タップ距離閾値は仕様の8pxに合わせる(3pxだと微振動でタップが潰れる)
const TAP_DISTANCE_THRESHOLD = 8
// 2本指タップとみなす接触時間と倍率変動
const TWO_FINGER_TAP_MS = 250
const TWO_FINGER_TAP_LEVEL = 0.07
// ダブルタップ判定
const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_DISTANCE = 40
// 慣性を開始する最低速度
const INERTIA_MIN_SPEED = 1.5

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

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const panRef = useRef({ active: false, id: -1, lastX: 0, lastY: 0, startX: 0, startY: 0, moved: false })
  const pinchRef = useRef({ active: false, startDist: 0, startScale: 1, startTime: 0, alx: 0, aly: 0, midX: 0, midY: 0 })
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
      // ピンチ開始
      panRef.current.active = false
      const pts = [...pointersRef.current.values()]
      const midX = (pts[0].x + pts[1].x) / 2
      const midY = (pts[0].y + pts[1].y) / 2
      const t = transformRef.current
      pinchRef.current = {
        active: true,
        startDist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        startScale: t.scale,
        startTime: Date.now(),
        alx: toLogical(midX, t.scale, t.translateX),
        aly: toLogical(midY, t.scale, t.translateY),
        midX,
        midY,
      }
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

    if (pinchRef.current.active && pointersRef.current.size >= 2) {
      const pts = [...pointersRef.current.values()]
      const midX = (pts[0].x + pts[1].x) / 2
      const midY = (pts[0].y + pts[1].y) / 2
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const rawScale = pinchRef.current.startScale * (dist / pinchRef.current.startDist)
      // バウンス範囲(minScale×0.8 〜 maxScale×1.2)まで許容
      const s = clamp(rawScale, minScaleRef.current * 0.8, MAX_SCALE * 1.2)
      pinchRef.current.midX = midX
      pinchRef.current.midY = midY
      applyTransform(
        { scale: s, translateX: midX - pinchRef.current.alx * s, translateY: midY - pinchRef.current.aly * s },
        true
      )
      return
    }

    if (panRef.current.active && e.pointerId === panRef.current.id) {
      const dx = x - panRef.current.lastX
      const dy = y - panRef.current.lastY
      if (!panRef.current.moved) {
        if (Math.hypot(x - panRef.current.startX, y - panRef.current.startY) > TAP_DISTANCE_THRESHOLD) {
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

  const endPinch = () => {
    const t = transformRef.current
    const { startTime, startScale, midX, midY, alx, aly } = pinchRef.current
    pinchRef.current.active = false
    // 2本指タップ: 接触≤250ms かつ log2 変動≤0.07 → −1レベル
    if (
      Date.now() - startTime <= TWO_FINGER_TAP_MS &&
      Math.abs(scaleToLevel(t.scale) - scaleToLevel(startScale)) <= TWO_FINGER_TAP_LEVEL
    ) {
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
  }

  const handleTap = (x: number, y: number) => {
    const now = Date.now()
    const last = lastTapRef.current
    if (now - last.t < DOUBLE_TAP_MS && Math.hypot(x - last.x, y - last.y) < DOUBLE_TAP_DISTANCE) {
      // ダブルタップ: 同地点でズーム済みなら元倍率へトグル、そうでなければ ×2
      const zoomed = transformRef.current.scale > minScaleRef.current * 1.5
      lerpZoom(zoomed ? -1 : 1, x, y)
      lastTapRef.current = { t: 0, x, y }
    } else {
      lastTapRef.current = { t: now, x, y }
    }
  }

  const onPointerUp = (e: ReactPointerEvent) => {
    const p = pointersRef.current.get(e.pointerId)
    pointersRef.current.delete(e.pointerId)
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // capture 未取得時は無視
    }

    if (pinchRef.current.active && pointersRef.current.size < 2) {
      endPinch()
      return
    }

    if (panRef.current.active && e.pointerId === panRef.current.id) {
      const wasMoved = panRef.current.moved
      panRef.current.active = false
      panRef.current.moved = false
      isPanningRef.current = false
      if (wasMoved) {
        // 慣性: 直近4フレーム delta 平均
        const samples = velRef.current.slice(-4)
        if (samples.length > 0) {
          const vx = samples.reduce((s, v) => s + v.x, 0) / samples.length
          const vy = samples.reduce((s, v) => s + v.y, 0) / samples.length
          if (Math.hypot(vx, vy) >= INERTIA_MIN_SPEED) {
            animRef.current = { kind: 'inertia', vx, vy, frame: 0 }
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
      } else if (p) {
        handleTap(p.x, p.y)
      }
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
