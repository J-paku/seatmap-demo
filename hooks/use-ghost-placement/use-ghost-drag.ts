import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { findCanvas } from './use-ghost-transform'
import type { GhostTransform } from './use-ghost-transform'
import { useEdgeAutoPan } from '@/hooks/use-edge-auto-pan'
import { triggerHaptic } from '@/utils/haptic'
import { edgePanDelta } from '@/utils/layout/edge-pan'
import { clampGhostCenter } from '@/utils/layout/rect'
import type { Rect } from '@/utils/layout/rect'
import { resizeRectToPointer } from '@/utils/layout/resize-anchor'
import type { ResizeHandle } from '@/utils/layout/resize-anchor'
import { computeResizeSnap, snapThreshold } from '@/utils/layout/snap-guides'
import type { SnapGuide } from '@/utils/layout/snap-guides'

// ゴーストを掴んでいる間だけの層。移動ドラッグ・リサイズ・2本目の指への引き渡しを持つ。
// 座標系(変換とキャンバス矩形)は use-ghost-transform、静止時の位置と描画値は
// use-ghost-placement が持ち、ここは「掴んでいる間に中心と寸法をどう動かすか」だけを持つ

// 実物由来のゴースト最大辺(viewBox 単位)。最小辺は utils/layout/rect の GHOST_MIN_SIZE
const GHOST_MAX_SIZE = 2500

// ドラッグ確定の移動量。これ未満は「掴んだだけ」とみなし自動パンを起こさない
// (編集ドラッグの DRAG_THRESHOLD_PX と同値)
const DRAG_CONFIRM_PX = 3

type DragState =
  | { kind: 'none' }
  // startX/startY/moved はドラッグ確定判定用。端ゾーンでゴーストを掴んだだけの
  // タップ(指の微振動)で自動パンを始めないため、確定前は edgePan を呼ばない
  | { kind: 'move'; pointerId: number; grabDx: number; grabDy: number; startX: number; startY: number; moved: boolean }
  | { kind: 'resize'; pointerId: number; handle: ResizeHandle; startX: number; startY: number; startRect: Rect }

export type GhostDrag = {
  // 枠を掴んで移動している間だけ true
  isDragging: boolean
  // リサイズ中に掴んでいるハンドル。していなければ null
  resizingHandle: ResizeHandle | null
  onGhostPointerDown: (e: ReactPointerEvent) => void
  onHandlePointerDown: (handle: ResizeHandle, e: ReactPointerEvent) => void
  // 掴んでいるかの同期判定。state ではなく ref を読む —
  // ガイドの引き直しはドラッグ中のフレームでも走るので、1フレーム古い値では判定できない
  isGrabbing: () => boolean
  // Esc 中止や非活性化から呼ぶ後始末
  reset: () => void
}

type Options = {
  active: boolean
  view: GhostTransform
  centerRef: RefObject<{ x: number; y: number } | null>
  sizeRef: RefObject<{ width: number; height: number }>
  minSizeRef: RefObject<{ width: number; height: number }>
  siblingsRef: RefObject<Rect[]>
  setCenter: (center: { x: number; y: number }) => void
  setLogicalSize: (size: { width: number; height: number }) => void
  setGuides: (guides: SnapGuide[]) => void
  // 論理矩形へスナップを掛け、そのぶん画面中心をずらす
  applySnap: (screenCenter: { x: number; y: number }) => { center: { x: number; y: number }; guides: SnapGuide[] }
}

export const useGhostDrag = ({
  active,
  view,
  centerRef,
  sizeRef,
  minSizeRef,
  siblingsRef,
  setCenter,
  setLogicalSize,
  setGuides,
  applySnap,
}: Options): GhostDrag => {
  const [isDragging, setIsDragging] = useState(false)
  const [resizingHandle, setResizingHandle] = useState<ResizeHandle | null>(null)
  const dragRef = useRef<DragState>({ kind: 'none' })
  // ポインタキャプチャを取った要素と、そのポインタの最後の画面座標。
  // 2本目の指が降りたときにキャンバスへ引き渡すのに要る(ピンチの引き継ぎ)
  const captureRef = useRef<{ target: Element; x: number; y: number } | null>(null)
  // 画面端自動パン。ゴーストが端で止まっても、地図側が滑って行き先が画面外へ広がる
  const edgePan = useEdgeAutoPan()
  const { readCanvasRect, transformRef, toLogicalRect, toScreenCenter, toScreenGuides } = view

  const reset = useCallback(() => {
    const captured = captureRef.current
    const drag = dragRef.current
    if (captured && drag.kind !== 'none') {
      try {
        ;(captured.target as Element & { releasePointerCapture: (id: number) => void }).releasePointerCapture(
          drag.pointerId
        )
      } catch {
        // capture 未取得・既に解放済みの場合は無視
      }
    }
    captureRef.current = null
    dragRef.current = { kind: 'none' }
    edgePan.stop()
    setIsDragging(false)
    setResizingHandle(null)
  }, [edgePan])

  const beginCapture = (e: ReactPointerEvent) => {
    try {
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      // 実ポインタでない(検証プローブの合成イベント)場合は capture を取れない
    }
    captureRef.current = { target: e.target as Element, x: e.clientX, y: e.clientY }
  }

  const onGhostPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      // 非プライマリ(2本目以降)のポインタはゴーストで受けない。受けるとキャンバスへ
      // 届かず、配置中の中央ピンチが原理的に成立しなくなる。既にドラッグ中の場合も同様
      if (!e.isPrimary || dragRef.current.kind !== 'none') return
      const cur = centerRef.current
      if (!cur) return
      readCanvasRect()
      e.stopPropagation()
      // 2本目の指がドラッグ状態を上書きしても、1本目が起こしたパンループを残さない
      edgePan.stop()
      dragRef.current = {
        kind: 'move',
        pointerId: e.pointerId,
        grabDx: e.clientX - cur.x,
        grabDy: e.clientY - cur.y,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
      }
      beginCapture(e)
      setIsDragging(true)
      // §04-1: 掴み = light
      triggerHaptic('light')
    },
    [centerRef, edgePan, readCanvasRect]
  )

  const onHandlePointerDown = useCallback(
    (handle: ResizeHandle, e: ReactPointerEvent) => {
      if (!e.isPrimary || dragRef.current.kind !== 'none') return
      const cur = centerRef.current
      if (!cur) return
      readCanvasRect()
      const rect = toLogicalRect(cur, sizeRef.current)
      if (!rect) return
      e.stopPropagation()
      // リサイズ経路は edgePan を使わないので、移動ドラッグのループをここで確実に止める
      edgePan.stop()
      dragRef.current = {
        kind: 'resize',
        pointerId: e.pointerId,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startRect: rect,
      }
      beginCapture(e)
      setResizingHandle(handle)
      // §04-1: リサイズ開始 = light
      triggerHaptic('light')
    },
    [centerRef, sizeRef, toLogicalRect, edgePan, readCanvasRect]
  )

  // 2本目の指が降りたらゴーストは手を引き、掴んでいたポインタをキャンバスへ引き渡す。
  // ゴースト層はキャンバスの DOM 木の外にいるため、ゴーストが受けたポインタは
  // そのままではキャンバスの pointersRef に載らず size===2 に到達しない。
  // ゴーストは画面中央に出るので2本指の1本目はほぼ必ずゴーストへ落ちる — この引き渡しが無いと
  // 「配置中に画面中央でピンチしても倍率が変わらない」が原理的に直らない
  useEffect(() => {
    if (!active) return
    const onWindowPointerDown = (e: PointerEvent) => {
      if (e.isPrimary) return
      const canvasEl = findCanvas()
      if (!canvasEl) return
      const drag = dragRef.current
      // キャンバスの内側で降りたポインタは既にキャンバスが受けている
      const swallowed = !(e.target instanceof Node) || !canvasEl.contains(e.target)
      if (drag.kind === 'none' && !swallowed) return
      const handOff: { pointerId: number; x: number; y: number }[] = []
      const captured = captureRef.current
      if (drag.kind !== 'none' && captured) {
        handOff.push({ pointerId: drag.pointerId, x: captured.x, y: captured.y })
      }
      if (swallowed) handOff.push({ pointerId: e.pointerId, x: e.clientX, y: e.clientY })
      if (handOff.length === 0) return
      reset()
      setGuides([])
      for (const p of handOff) {
        canvasEl.dispatchEvent(
          new PointerEvent('pointerdown', {
            pointerId: p.pointerId,
            pointerType: e.pointerType,
            clientX: p.x,
            clientY: p.y,
            bubbles: true,
            cancelable: true,
          })
        )
        // 以降の pointermove / pointerup をキャンバスへ届ける。
        // ヒットテストはゴーストを指したままなので、キャプチャで宛先を固定する
        try {
          canvasEl.setPointerCapture(p.pointerId)
        } catch {
          // 既に離されたポインタは対象にならない
        }
      }
    }
    window.addEventListener('pointerdown', onWindowPointerDown)
    return () => window.removeEventListener('pointerdown', onWindowPointerDown)
  }, [active, reset, setGuides])

  useEffect(() => {
    if (!active) return

    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (drag.kind === 'none' || drag.pointerId !== e.pointerId) return
      const t = transformRef.current
      const canvas = readCanvasRect()
      if (!canvas) return
      if (captureRef.current) {
        captureRef.current.x = e.clientX
        captureRef.current.y = e.clientY
      }

      if (drag.kind === 'move') {
        if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > DRAG_CONFIRM_PX) {
          drag.moved = true
        }
        // クランプにはフットプリント(実寸×scale)を使う。44px下限で膨らんだ描画箱ではない —
        // 目的は「置かれる物をキャンバスの内側に留める」ことなので、膨らんだ箱のはみ出しは許容する
        const footprint = { width: sizeRef.current.width * t.scale, height: sizeRef.current.height * t.scale }
        const raw = clampGhostCenter({ x: e.clientX - drag.grabDx, y: e.clientY - drag.grabDy }, canvas, footprint)
        // 端ゾーンでは吸着させない。自動パンで地図側が毎フレーム動くため、吸着先も
        // 毎フレーム変わり、ガイドが実位置とずれたまま凍り付く
        const panning = drag.moved && edgePanDelta({ x: e.clientX, y: e.clientY }, canvas) !== null
        const snapped = panning ? null : applySnap(raw)
        setCenter(snapped ? clampGhostCenter(snapped.center, canvas, footprint) : raw)
        setGuides(snapped ? toScreenGuides(snapped.guides) : [])
        // 自動パンはドラッグ確定後のみ。端ゾーンで掴んだだけのタップでパンさせない
        if (drag.moved) edgePan.update(e.clientX, e.clientY, canvas)
        return
      }

      // リサイズは論理座標で計算する。掴んだ反対側エッジは論理位置が動かない
      const px = (e.clientX - canvas.left - t.tx) / t.scale
      const py = (e.clientY - canvas.top - t.ty) / t.scale
      const limits = {
        minW: minSizeRef.current.width,
        minH: minSizeRef.current.height,
        max: GHOST_MAX_SIZE,
      }
      const resized = resizeRectToPointer(drag.startRect, drag.handle, { x: px, y: py }, limits)
      // 移動と違い、リサイズでは矩形を平行移動させない。対辺を止めたまま動く辺だけ吸着させる
      const snap = computeResizeSnap(
        resized,
        siblingsRef.current,
        snapThreshold(resized, t.scale),
        drag.handle,
        limits
      )
      const snappedRect: Rect = snap.rect
      sizeRef.current = { width: snappedRect.w, height: snappedRect.h }
      setLogicalSize({ width: snappedRect.w, height: snappedRect.h })
      const nextCenter = toScreenCenter(snappedRect)
      if (nextCenter) setCenter(nextCenter)
      setGuides(toScreenGuides(snap.guides))
    }

    const endDrag = (e: PointerEvent, released: boolean) => {
      const drag = dragRef.current
      if (drag.kind === 'none' || drag.pointerId !== e.pointerId) return
      captureRef.current = null
      dragRef.current = { kind: 'none' }
      edgePan.stop()
      setIsDragging(false)
      setResizingHandle(null)
      setGuides([])
      // §04-1: 離し = medium。pointercancel は「離した」ではないので鳴らさない
      if (released) triggerHaptic('medium')
    }

    const onUp = (e: PointerEvent) => endDrag(e, true)
    const onCancel = (e: PointerEvent) => endDrag(e, false)

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
  }, [
    active,
    applySnap,
    edgePan,
    minSizeRef,
    readCanvasRect,
    setCenter,
    setGuides,
    setLogicalSize,
    siblingsRef,
    sizeRef,
    toScreenCenter,
    toScreenGuides,
    transformRef,
  ])

  const isGrabbing = useCallback(() => dragRef.current.kind !== 'none', [])

  // 呼び出し側の effect 依存に入るので参照ごと安定させる。毎レンダー新しい object を返すと、
  // 起動 effect が毎レンダー走ってゴーストが中央へ戻り続ける
  return useMemo(
    () => ({ isDragging, resizingHandle, onGhostPointerDown, onHandlePointerDown, isGrabbing, reset }),
    [isDragging, resizingHandle, onGhostPointerDown, onHandlePointerDown, isGrabbing, reset]
  )
}
