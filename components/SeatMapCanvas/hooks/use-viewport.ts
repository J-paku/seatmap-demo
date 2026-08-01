import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useViewportInput } from './use-viewport-input'
import { stepAnim } from '../utils/anim-step'
import { prefersReducedMotion } from '../utils/canvas-metrics'
import type { Anim, Viewport } from '../type'
import {
  MAX_SCALE,
  clamp,
  computeCompact,
  computeMinScale,
  levelToScale,
  scaleToLevel,
  toLogical,
  zoomAtPoint,
} from '@/utils/geometry'
import type { Transform } from '@/utils/geometry'

// パン・ズームの変換そのものを持つ。DOM へ直接 transform を当て、再レンダーは
// ジェスチャー終了時の scaleSnap 更新だけに絞る


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

  // LOD/カウンタ補正用スナップショット(ジェスチャ終了時のみ更新)。
  // レンダー中に transformRef を読まずに済ませるため変換一式で持つ
  const [transformSnap, setTransformSnap] = useState<Transform>({ scale: 0.5, translateX: 0, translateY: 0 })

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

  const commitSnap = useCallback(() => setTransformSnap(transformRef.current), [])

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
      applyTransform(zoomAtPoint(t, s, anchorX, anchorY), overscroll)
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

  // 初期コンパクト変換(マウント1回のみ)
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el || mountedRef.current) return
    const r = el.getBoundingClientRect()
    rectRef.current = r
    minScaleRef.current = computeMinScale(r.width, r.height)
    const compact = computeCompact(r.width, r.height)
    applyTransform(compact)
    setTransformSnap(compact)
    mountedRef.current = true
  }, [applyTransform])

  // 入力(リサイズ・キーボード・ホイール)は useViewportInput が変換モデルへ繋ぐ
  useViewportInput({ containerRef, rectRef, rect, cancelAnim, lerpZoom, immediateZoom })

  useEffect(() => () => cancelAnim(), [cancelAnim])

  return {
    containerRef,
    layerRef,
    transformRef,
    minScaleRef,
    animRef,
    scaleSnap: transformSnap.scale,
    transformSnap,
    rect,
    applyTransform,
    commitSnap,
    cancelAnim,
    startLoop,
    lerpZoom,
    immediateZoom,
    animateTo,
  }
}
