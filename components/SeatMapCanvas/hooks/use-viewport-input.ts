import { useEffect } from 'react'
import type { RefObject } from 'react'
import { isModalOpen } from '../utils/canvas-metrics'
import { clamp } from '@/utils/geometry'

// キャンバスへの入力(リサイズ再計測・キーボード ±・ホイール/トラックパッド)を変換モデルへ繋ぐ。
// 変換そのものは useViewport が持ち、ここは「いつ呼ぶか」だけを担う

// ホイール1ノッチをレベルへ換算する係数
const WHEEL_PER_LEVEL = 100
// トラックパッドピンチ: 70px=1レベル
const PINCH_PX_PER_LEVEL = 70
// 行スクロール(deltaMode=1)のpx換算
const LINE_TO_PX = 33

type Options = {
  containerRef: RefObject<HTMLDivElement | null>
  rectRef: RefObject<DOMRect | null>
  rect: () => DOMRect | null
  cancelAnim: () => void
  lerpZoom: (deltaLevel: number, anchorX: number, anchorY: number) => void
  immediateZoom: (deltaLevel: number, anchorX: number, anchorY: number, overscroll?: boolean) => void
}

export const useViewportInput = ({
  containerRef,
  rectRef,
  rect,
  cancelAnim,
  lerpZoom,
  immediateZoom,
}: Options): void => {
  // リサイズ: rect キャッシュのみ再計測(transform は維持)
  useEffect(() => {
    const onResize = () => {
      if (containerRef.current) rectRef.current = containerRef.current.getBoundingClientRect()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [containerRef, rectRef])

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
        immediateZoom(-e.deltaY / PINCH_PX_PER_LEVEL, ax, ay)
        return
      }
      let delta = e.deltaY
      if (e.deltaMode === 1) delta *= LINE_TO_PX
      delta = clamp(delta, -WHEEL_PER_LEVEL, WHEEL_PER_LEVEL)
      lerpZoom(-delta / WHEEL_PER_LEVEL, ax, ay)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [containerRef, rect, cancelAnim, immediateZoom, lerpZoom])
}
