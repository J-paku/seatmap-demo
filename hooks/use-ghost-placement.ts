import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { SEATMAP_BG_ID } from '@/components/SheetShell'
import { clamp } from '@/utils/geometry'
import type { Rect } from '@/utils/rect'
import { resizeRect } from '@/utils/resize-anchor'
import type { ResizeHandle } from '@/utils/resize-anchor'
import { SNAP_THRESHOLD_SCREEN_PX, computeSnap } from '@/utils/snap-guides'
import type { SnapGuide } from '@/utils/snap-guides'

// ビューファインダー式ゴーストの配置モデル。
//
// ゴーストの中心は「画面座標」で持ち、大きさは「viewBox 実寸」で持つ。こうするとキャンバスを
// パン/ズームしてもゴーストは画面上で動かず、下のキャンバス側が動いて位置が合う。
// 指でゴーストを引きずると置きたい場所が指で隠れる、というモバイルの根本問題を、
// カメラのビューファインダーと同じ発想で回避する仕組み。
//
// 変換の取得にキャンバス内部の ref を使わず DOM 属性を監視するのは、ゴースト層を
// キャンバスの DOM 木の外へ置くため。ゴーストをキャンバスの子にすると、その scrim が
// キャンバスの pointerdown を丸ごと奪ってパン/ズームが完全に止まる

// 実物由来のゴースト最小・最大辺(viewBox 単位)
export const GHOST_MIN_SIZE = 40
const GHOST_MAX_SIZE = 2500

type Transform = { scale: number; tx: number; ty: number }

type Options = {
  active: boolean
  // viewBox 実寸。再配置のときは現在サイズを渡す
  size: { width: number; height: number }
  // 再配置のとき現在の論理矩形。新規配置では省く
  initialRect?: Rect | null
  resizable: boolean
  // 最小寸法の上書き(会議室は座席1つ分 105×75 を下回らせない)
  minSize?: { width: number; height: number }
  // 吸着相手(viewBox 系)
  siblings: Rect[]
  // 置けるかどうかの判定。ポリシーは utils/layout-rules 側に置き、ここは呼ぶだけ
  isBlocked?: (rect: Rect) => boolean
}

export type GhostPlacement = {
  screenRect: { left: number; top: number; width: number; height: number } | null
  logicalRect: Rect | null
  // ガイド線は画面座標で返す。ゴースト層は position:fixed でキャンバスの変換の外にいるため
  screenGuides: SnapGuide[]
  blocked: boolean
  isDragging: boolean
  onGhostPointerDown: (e: ReactPointerEvent) => void
  onHandlePointerDown: (handle: ResizeHandle, e: ReactPointerEvent) => void
  // 確定値。パン/ズームで位置を合わせた場合にも吸着させたいので、ここでもう一度スナップを掛ける
  commit: () => Rect | null
}

const readTransform = (layer: Element): Transform => {
  const m = new DOMMatrixReadOnly(getComputedStyle(layer).transform)
  return { scale: m.a || 1, tx: m.e, ty: m.f }
}

const findLayer = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[data-canvas-transform-layer="true"]')

const findCanvas = (): HTMLElement | null => document.getElementById(SEATMAP_BG_ID)

type DragState =
  | { kind: 'none' }
  | { kind: 'move'; pointerId: number; grabDx: number; grabDy: number }
  | { kind: 'resize'; pointerId: number; handle: ResizeHandle; startX: number; startY: number; startRect: Rect }

export const useGhostPlacement = ({
  active,
  size,
  initialRect = null,
  minSize = { width: GHOST_MIN_SIZE, height: GHOST_MIN_SIZE },
  siblings,
  isBlocked,
}: Options): GhostPlacement => {
  const [transform, setTransform] = useState<Transform>({ scale: 1, tx: 0, ty: 0 })
  // 画面座標のゴースト中心
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null)
  // viewBox 実寸。リサイズで変わる
  const [logicalSize, setLogicalSize] = useState(size)
  const [guides, setGuides] = useState<SnapGuide[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const canvasRectRef = useRef<DOMRect | null>(null)
  const transformRef = useRef<Transform>({ scale: 1, tx: 0, ty: 0 })
  const centerRef = useRef<{ x: number; y: number } | null>(null)
  const sizeRef = useRef(size)
  const siblingsRef = useRef(siblings)
  const dragRef = useRef<DragState>({ kind: 'none' })
  const minSizeRef = useRef(minSize)

  // ポインタ/rAF ハンドラは「今の値」を読む必要がある。effect へ移すと、同じコミットで
  // 張ったハンドラが1フレーム古い値を掴んでドラッグが1フレーム遅れて追従する
  /* eslint-disable react-hooks/refs */
  siblingsRef.current = siblings
  transformRef.current = transform
  centerRef.current = center
  sizeRef.current = logicalSize
  minSizeRef.current = minSize
  /* eslint-enable react-hooks/refs */

  // 画面座標 → viewBox 座標
  const toLogicalRect = useCallback(
    (screenCenter: { x: number; y: number }, s: { width: number; height: number }): Rect | null => {
      const canvas = canvasRectRef.current
      if (!canvas) return null
      const t = transformRef.current
      const cx = (screenCenter.x - canvas.left - t.tx) / t.scale
      const cy = (screenCenter.y - canvas.top - t.ty) / t.scale
      return { x: cx - s.width / 2, y: cy - s.height / 2, w: s.width, h: s.height }
    },
    []
  )

  // viewBox 座標 → 画面座標の中心
  const toScreenCenter = useCallback((rect: Rect): { x: number; y: number } | null => {
    const canvas = canvasRectRef.current
    if (!canvas) return null
    const t = transformRef.current
    return {
      x: canvas.left + t.tx + (rect.x + rect.w / 2) * t.scale,
      y: canvas.top + t.ty + (rect.y + rect.h / 2) * t.scale,
    }
  }, [])

  // 中心をキャンバス矩形の内側へ収める(表示サイズの半分ぶん内側)。
  // ズームで表示サイズがキャンバスより大きくなった場合は中央へ寄せる
  const clampCenter = useCallback((next: { x: number; y: number }) => {
    const canvas = canvasRectRef.current
    if (!canvas) return next
    const t = transformRef.current
    const halfW = Math.min(sizeRef.current.width * t.scale, canvas.width) / 2
    const halfH = Math.min(sizeRef.current.height * t.scale, canvas.height) / 2
    return {
      x: clamp(next.x, canvas.left + halfW, canvas.right - halfW),
      y: clamp(next.y, canvas.top + halfH, canvas.bottom - halfH),
    }
  }, [])

  // ガイド線を画面座標へ移す。ゴースト層はキャンバスの変換の外にいるので viewBox 座標では描けない
  const toScreenGuides = useCallback((gs: SnapGuide[]): SnapGuide[] => {
    const canvas = canvasRectRef.current
    if (!canvas) return []
    const t = transformRef.current
    return gs.map((g) =>
      g.axis === 'vertical'
        ? { axis: 'vertical', pos: canvas.left + t.tx + g.pos * t.scale }
        : { axis: 'horizontal', pos: canvas.top + t.ty + g.pos * t.scale }
    )
  }, [])

  // 論理矩形へスナップを掛け、そのぶん画面中心をずらす
  const applySnap = useCallback((screenCenter: { x: number; y: number }) => {
    const rect = toLogicalRect(screenCenter, sizeRef.current)
    if (!rect) return { center: screenCenter, guides: [] as SnapGuide[] }
    const t = transformRef.current
    const snap = computeSnap(rect, siblingsRef.current, SNAP_THRESHOLD_SCREEN_PX / t.scale)
    return {
      center: { x: screenCenter.x + (snap.x - rect.x) * t.scale, y: screenCenter.y + (snap.y - rect.y) * t.scale },
      guides: snap.guides,
    }
  }, [toLogicalRect])

  // 起動時: キャンバス矩形と変換を実測し、初期位置を決める。
  // 非活性化時の後始末も同じ effect が持つ(実測値は描画中には作れない)
  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCenter(null)
      setGuides([])
      dragRef.current = { kind: 'none' }
      return
    }
    const canvas = findCanvas()
    const layer = findLayer()
    if (!canvas || !layer) return
    canvasRectRef.current = canvas.getBoundingClientRect()
    const t = readTransform(layer)
    transformRef.current = t
    setTransform(t)
    // サイズ上書きはここでリセットする(前回のリサイズ結果を引きずらない)
    sizeRef.current = size
    setLogicalSize(size)
    const initial = initialRect
      ? toScreenCenter(initialRect)
      : {
          x: canvasRectRef.current.left + canvasRectRef.current.width / 2,
          y: canvasRectRef.current.top + canvasRectRef.current.height / 2,
        }
    setCenter(initial)
  }, [active, size, initialRect, toScreenCenter])

  // キャンバスの transform を監視して、ゴーストの表示寸法を実寸×scale に追従させる
  useEffect(() => {
    if (!active) return
    const layer = findLayer()
    if (!layer) return
    const observer = new MutationObserver(() => {
      const next = readTransform(layer)
      const cur = transformRef.current
      // 変化が無い通知でレンダーを起こさない(パン中は毎フレーム飛んでくる)
      if (next.scale === cur.scale && next.tx === cur.tx && next.ty === cur.ty) return
      transformRef.current = next
      setTransform(next)
    })
    observer.observe(layer, { attributes: true, attributeFilter: ['style'] })
    return () => observer.disconnect()
  }, [active])

  // ウィンドウサイズが変わるとキャンバス矩形が変わる
  useEffect(() => {
    if (!active) return
    const onResize = () => {
      const canvas = findCanvas()
      if (canvas) canvasRectRef.current = canvas.getBoundingClientRect()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [active])

  const onGhostPointerDown = useCallback((e: ReactPointerEvent) => {
    const cur = centerRef.current
    if (!cur) return
    e.stopPropagation()
    dragRef.current = {
      kind: 'move',
      pointerId: e.pointerId,
      grabDx: e.clientX - cur.x,
      grabDy: e.clientY - cur.y,
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setIsDragging(true)
  }, [])

  const onHandlePointerDown = useCallback(
    (handle: ResizeHandle, e: ReactPointerEvent) => {
      const cur = centerRef.current
      if (!cur) return
      const rect = toLogicalRect(cur, sizeRef.current)
      if (!rect) return
      e.stopPropagation()
      dragRef.current = {
        kind: 'resize',
        pointerId: e.pointerId,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startRect: rect,
      }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      setIsDragging(true)
    },
    [toLogicalRect]
  )

  useEffect(() => {
    if (!active) return

    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (drag.kind === 'none' || drag.pointerId !== e.pointerId) return
      const t = transformRef.current

      if (drag.kind === 'move') {
        const raw = clampCenter({ x: e.clientX - drag.grabDx, y: e.clientY - drag.grabDy })
        const snapped = applySnap(raw)
        setCenter(clampCenter(snapped.center))
        setGuides(toScreenGuides(snapped.guides))
        return
      }

      // リサイズは論理座標で計算する。掴んだ反対側エッジは論理位置が動かない
      const dx = (e.clientX - drag.startX) / t.scale
      const dy = (e.clientY - drag.startY) / t.scale
      const resized = resizeRect(drag.startRect, drag.handle, dx, dy, {
        minW: minSizeRef.current.width,
        minH: minSizeRef.current.height,
        max: GHOST_MAX_SIZE,
      })
      const snap = computeSnap(resized, siblingsRef.current, SNAP_THRESHOLD_SCREEN_PX / t.scale)
      const snappedRect: Rect = { ...resized, x: snap.x, y: snap.y }
      sizeRef.current = { width: snappedRect.w, height: snappedRect.h }
      setLogicalSize({ width: snappedRect.w, height: snappedRect.h })
      const nextCenter = toScreenCenter(snappedRect)
      if (nextCenter) setCenter(nextCenter)
      setGuides(toScreenGuides(snap.guides))
    }

    const onUp = (e: PointerEvent) => {
      const drag = dragRef.current
      if (drag.kind === 'none' || drag.pointerId !== e.pointerId) return
      dragRef.current = { kind: 'none' }
      setIsDragging(false)
      setGuides([])
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [active, applySnap, clampCenter, toScreenCenter, toScreenGuides])

  // 実測したキャンバス矩形(ref)から描画用の論理矩形を導く。state に持たせると
  // 実測 → setState → 再描画 の1往復が挟まり、ゴーストが1フレーム遅れて出る
  // eslint-disable-next-line react-hooks/refs
  const logicalRect = center ? toLogicalRect(center, logicalSize) : null
  const blocked = logicalRect && isBlocked ? isBlocked(logicalRect) : false

  const screenRect = center
    ? {
        left: center.x - (logicalSize.width * transform.scale) / 2,
        top: center.y - (logicalSize.height * transform.scale) / 2,
        width: logicalSize.width * transform.scale,
        height: logicalSize.height * transform.scale,
      }
    : null

  const commit = useCallback((): Rect | null => {
    const cur = centerRef.current
    if (!cur) return null
    const rect = toLogicalRect(cur, sizeRef.current)
    if (!rect) return null
    // 確定時にもう一度スナップを掛ける。ゴーストを触らずキャンバス側を動かして位置を
    // 合わせた場合、ドラッグ中に計算した吸着結果は既に古いため
    const snap = computeSnap(rect, siblingsRef.current, SNAP_THRESHOLD_SCREEN_PX / transformRef.current.scale)
    return { ...rect, x: snap.x, y: snap.y }
  }, [toLogicalRect])

  return {
    screenRect,
    logicalRect,
    screenGuides: guides,
    blocked,
    isDragging,
    onGhostPointerDown,
    onHandlePointerDown,
    commit,
  }
}

