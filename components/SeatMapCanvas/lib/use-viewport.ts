import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { stepAnim } from '../utils/anim-step'
import { isModalOpen, prefersReducedMotion } from '../utils/canvas-metrics'
import type { Anim } from '../type'
import {
  MAX_SCALE,
  clamp,
  computeCompact,
  computeMinScale,
  levelToScale,
  scaleToLevel,
  toLogical,
} from '@/lib/geometry'
import type { Transform } from '@/lib/geometry'

// パン・ズームの変換そのものを持つ。DOM へ直接 transform を当て、再レンダーは
// ジェスチャー終了時の scaleSnap 更新だけに絞る

export type Viewport = {
  containerRef: RefObject<HTMLDivElement | null>
  layerRef: RefObject<HTMLDivElement | null>
  transformRef: RefObject<Transform>
  minScaleRef: RefObject<number>
  animRef: RefObject<Anim>
  scaleSnap: number
  rect: () => DOMRect | null
  applyTransform: (t: Transform, allowOverscroll?: boolean) => void
  commitSnap: () => void
  cancelAnim: () => void
  startLoop: () => void
  lerpZoom: (deltaLevel: number, anchorX: number, anchorY: number) => void
  immediateZoom: (deltaLevel: number, anchorX: number, anchorY: number, overscroll?: boolean) => void
  zoomButton: (delta: number) => void
  resetView: () => void
  animateTo: (target: Transform, onDone?: () => void) => void
}

// アニメーション付きで移動したあと transition を外すまでの時間
const TRANSITION_MS = 300

export const useViewport = (): Viewport => {
  const containerRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const transformRef = useRef<Transform>({ scale: 0.5, translateX: 0, translateY: 0 })
  const rectRef = useRef<DOMRect | null>(null)
  const minScaleRef = useRef(0.25)
  const mountedRef = useRef(false)
  const rafRef = useRef(0)
  const animRef = useRef<Anim>({ kind: 'none' })

  // LOD/カウンタ補正用スナップショット(ジェスチャ終了時のみ更新)
  const [scaleSnap, setScaleSnap] = useState(0.5)

  const rect = useCallback(() => {
    if (!rectRef.current && containerRef.current) {
      rectRef.current = containerRef.current.getBoundingClientRect()
    }
    return rectRef.current
  }, [])

  // 変換を DOM に直接適用(scale クランプは bounce 以外で有効)
  const applyTransform = useCallback((t: Transform, allowOverscroll = false) => {
    let s = t.scale
    if (!allowOverscroll) s = clamp(s, minScaleRef.current, MAX_SCALE)
    const next = { scale: s, translateX: t.translateX, translateY: t.translateY }
    transformRef.current = next
    const el = layerRef.current
    if (el) {
      el.style.transform = `translate3d(${next.translateX}px, ${next.translateY}px, 0) scale(${next.scale})`
    }
  }, [])

  const commitSnap = useCallback(() => setScaleSnap(transformRef.current.scale), [])

  const cancelAnim = useCallback(() => {
    animRef.current = { kind: 'none' }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [])

  // rAF ループ(inertia / lerp / bounce)。1フレーム分の計算は stepAnim に寄せる
  const startLoop = useCallback(() => {
    if (rafRef.current) return
    const tick = () => {
      const step = stepAnim(animRef.current, transformRef.current, minScaleRef.current)
      if (step) {
        applyTransform(step.transform, step.overscroll)
        animRef.current = step.nextAnim
        if (step.commitSnap) commitSnap()
      }
      if (animRef.current.kind === 'none') {
        rafRef.current = 0
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [applyTransform, commitSnap])

  // 基点固定の lerp ズーム(±level)
  const lerpZoom = useCallback(
    (deltaLevel: number, anchorX: number, anchorY: number) => {
      const t = transformRef.current
      const targetLevel = clamp(
        scaleToLevel(t.scale) + deltaLevel,
        scaleToLevel(minScaleRef.current),
        scaleToLevel(MAX_SCALE)
      )
      animRef.current = {
        kind: 'lerp',
        targetLevel,
        ax: anchorX,
        ay: anchorY,
        alx: toLogical(anchorX, t.scale, t.translateX),
        aly: toLogical(anchorY, t.scale, t.translateY),
      }
      startLoop()
    },
    [startLoop]
  )

  // 即時ズーム(トラックパッド・ピンチ用)
  const immediateZoom = useCallback(
    (deltaLevel: number, anchorX: number, anchorY: number, overscroll = false) => {
      const t = transformRef.current
      const raw = levelToScale(scaleToLevel(t.scale) + deltaLevel)
      const s = overscroll ? raw : clamp(raw, minScaleRef.current, MAX_SCALE)
      const lx = toLogical(anchorX, t.scale, t.translateX)
      const ly = toLogical(anchorY, t.scale, t.translateY)
      applyTransform({ scale: s, translateX: anchorX - lx * s, translateY: anchorY - ly * s }, overscroll)
    },
    [applyTransform]
  )

  // transition 付きで目標変換へ移す。reduced-motion では即時配置
  const animateTo = useCallback(
    (target: Transform, onDone?: () => void) => {
      const el = layerRef.current
      if (!el) {
        onDone?.()
        return
      }
      if (prefersReducedMotion()) {
        el.style.transition = ''
        applyTransform(target)
        commitSnap()
        onDone?.()
        return
      }
      el.style.transition = `transform ${TRANSITION_MS / 1000}s ease-out`
      applyTransform(target)
      window.setTimeout(() => {
        el.style.transition = ''
        commitSnap()
        onDone?.()
      }, TRANSITION_MS)
    },
    [applyTransform, commitSnap]
  )

  const zoomButton = useCallback(
    (delta: number) => {
      const r = rect()
      if (!r) return
      cancelAnim()
      lerpZoom(delta, r.width / 2, r.height / 2)
    },
    [rect, cancelAnim, lerpZoom]
  )

  const resetView = useCallback(() => {
    cancelAnim()
    const r = rect()
    if (!r) return
    animateTo(computeCompact(r.width, r.height))
  }, [rect, cancelAnim, animateTo])

  // 初期コンパクト変換(マウント1回のみ)
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el || mountedRef.current) return
    const r = el.getBoundingClientRect()
    rectRef.current = r
    minScaleRef.current = computeMinScale(r.width, r.height)
    const compact = computeCompact(r.width, r.height)
    applyTransform(compact)
    setScaleSnap(compact.scale)
    mountedRef.current = true
  }, [applyTransform])

  // リサイズ: rect キャッシュのみ再計測(transform は維持)
  useEffect(() => {
    const onResize = () => {
      if (containerRef.current) rectRef.current = containerRef.current.getBoundingClientRect()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // キーボード ±level
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isModalOpen()) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const r = rect()
      if (!r) return
      if (e.key === '+' || e.key === '=') {
        cancelAnim()
        lerpZoom(1, r.width / 2, r.height / 2)
      } else if (e.key === '-' || e.key === '_') {
        cancelAnim()
        lerpZoom(-1, r.width / 2, r.height / 2)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rect, cancelAnim, lerpZoom])

  // ホイール/トラックパッドズーム(native passive:false 登録)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (isModalOpen()) return
      e.preventDefault()
      cancelAnim()
      const r = rect()
      if (!r) return
      const ax = e.clientX - r.left
      const ay = e.clientY - r.top
      if (e.ctrlKey) {
        // トラックパッドピンチ: 70px=1レベル 即時
        immediateZoom(-e.deltaY / 70, ax, ay)
        return
      }
      let delta = e.deltaY
      if (e.deltaMode === 1) delta *= 33 // 行スクロール換算
      delta = clamp(delta, -100, 100)
      lerpZoom(-delta / 100, ax, ay)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [rect, cancelAnim, immediateZoom, lerpZoom])

  useEffect(() => () => cancelAnim(), [cancelAnim])

  return {
    containerRef,
    layerRef,
    transformRef,
    minScaleRef,
    animRef,
    scaleSnap,
    rect,
    applyTransform,
    commitSnap,
    cancelAnim,
    startLoop,
    lerpZoom,
    immediateZoom,
    zoomButton,
    resetView,
    animateTo,
  }
}
