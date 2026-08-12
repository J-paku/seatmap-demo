import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { SEATMAP_BG_ID } from '@/components/SheetShell'
import { useEdgeAutoPan } from '@/hooks/use-edge-auto-pan'
import { triggerHaptic } from '@/utils/haptic'
import { edgePanDelta } from '@/utils/layout/edge-pan'
import { clamp } from '@/utils/layout/geometry'
import { GHOST_MIN_SIZE, clampGhostDisplaySize } from '@/utils/layout/rect'
import type { Rect } from '@/utils/layout/rect'
import { resizeRect } from '@/utils/layout/resize-anchor'
import type { ResizeHandle } from '@/utils/layout/resize-anchor'
import { computeResizeSnap, computeSnap, snapThreshold } from '@/utils/layout/snap-guides'
import type { SnapGuide } from '@/utils/layout/snap-guides'
import type { PlacementBlockReason } from '@/utils/layout/layout-rules'

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

// 実物由来のゴースト最大辺(viewBox 単位)。最小辺は utils/layout/rect の GHOST_MIN_SIZE
const GHOST_MAX_SIZE = 2500

// ドラッグ確定の移動量。これ未満は「掴んだだけ」とみなし自動パンを起こさない
// (編集ドラッグの DRAG_THRESHOLD_PX と同値)
const DRAG_CONFIRM_PX = 3

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
  // 置けない理由の判定。ポリシーは utils/layout/layout-rules 側に置き、ここは呼ぶだけ
  blockReason?: (rect: Rect) => PlacementBlockReason | null
}

export type GhostPlacement = {
  screenRect: { left: number; top: number; width: number; height: number } | null
  logicalRect: Rect | null
  // ガイド線は画面座標で返す。ゴースト層は position:fixed でキャンバスの変換の外にいるため
  screenGuides: SnapGuide[]
  blocked: boolean
  // 置けない理由。文言の出し分け(フロア外/重なり)に使う
  blockReason: PlacementBlockReason | null
  // 重なっている障害物の画面座標矩形。ゴースト層が強調表示に使う
  screenBlockedRects: { left: number; top: number; width: number; height: number }[]
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
  // startX/startY/moved はドラッグ確定判定用。端ゾーンでゴーストを掴んだだけの
  // タップ(指の微振動)で自動パンを始めないため、確定前は edgePan を呼ばない
  | { kind: 'move'; pointerId: number; grabDx: number; grabDy: number; startX: number; startY: number; moved: boolean }
  | { kind: 'resize'; pointerId: number; handle: ResizeHandle; startX: number; startY: number; startRect: Rect }

export const useGhostPlacement = ({
  active,
  size,
  initialRect = null,
  minSize = { width: GHOST_MIN_SIZE, height: GHOST_MIN_SIZE },
  siblings,
  blockReason: getBlockReason,
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
  // 画面端自動パン。ゴーストが端で止まっても、地図側が滑って行き先が画面外へ広がる
  const edgePan = useEdgeAutoPan()

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

  // ガイド線を画面座標へ移す。ゴースト層はキャンバスの変換の外にいるので viewBox 座標では描けない。
  // start/end は線に沿った軸の値なので、pos とは別の軸で変換する
  const toScreenGuides = useCallback((gs: SnapGuide[]): SnapGuide[] => {
    const canvas = canvasRectRef.current
    if (!canvas) return []
    const t = transformRef.current
    const toX = (v: number) => canvas.left + t.tx + v * t.scale
    const toY = (v: number) => canvas.top + t.ty + v * t.scale
    return gs.map((g) =>
      g.axis === 'vertical'
        ? { axis: 'vertical', pos: toX(g.pos), start: toY(g.start), end: toY(g.end) }
        : { axis: 'horizontal', pos: toY(g.pos), start: toX(g.start), end: toX(g.end) }
    )
  }, [])

  // 論理矩形へスナップを掛け、そのぶん画面中心をずらす
  const applySnap = useCallback((screenCenter: { x: number; y: number }) => {
    const rect = toLogicalRect(screenCenter, sizeRef.current)
    if (!rect) return { center: screenCenter, guides: [] as SnapGuide[] }
    const t = transformRef.current
    const snap = computeSnap(rect, siblingsRef.current, snapThreshold(rect, t.scale))
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
      // ドラッグ中に配置がキャンセルされた場合、パンループだけ生き残らせない
      edgePan.stop()
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
  }, [active, size, initialRect, toScreenCenter, edgePan])

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
      // §04-3: パン・ズーム中もスナップを引き直す。ゴーストは画面に固定なので、
      // 地図が動いた分だけ論理位置が変わり、吸着相手も変わる。ここで引き直さないと
      // 「ゴーストを触らず地図側で位置を合わせた」ときガイドが出ないまま確定時に吸着する
      if (dragRef.current.kind !== 'none') return
      const held = centerRef.current
      if (!held) return
      const snapped = applySnap(held)
      const nextCenter = clampCenter(snapped.center)
      centerRef.current = nextCenter
      setCenter(nextCenter)
      setGuides(toScreenGuides(snapped.guides))
    })
    observer.observe(layer, { attributes: true, attributeFilter: ['style'] })
    return () => observer.disconnect()
  }, [active, applySnap, clampCenter, toScreenGuides])

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

  const onGhostPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      const cur = centerRef.current
      if (!cur) return
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
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      setIsDragging(true)
      // §04-1: 掴み = light
      triggerHaptic('light')
    },
    [edgePan]
  )

  const onHandlePointerDown = useCallback(
    (handle: ResizeHandle, e: ReactPointerEvent) => {
      const cur = centerRef.current
      if (!cur) return
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
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      setIsDragging(true)
      // §04-1: リサイズ開始 = light
      triggerHaptic('light')
    },
    [toLogicalRect, edgePan]
  )

  useEffect(() => {
    if (!active) return

    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (drag.kind === 'none' || drag.pointerId !== e.pointerId) return
      const t = transformRef.current

      if (drag.kind === 'move') {
        if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > DRAG_CONFIRM_PX) {
          drag.moved = true
        }
        const raw = clampCenter({ x: e.clientX - drag.grabDx, y: e.clientY - drag.grabDy })
        // 端ゾーンでは吸着させない。自動パンで地図側が毎フレーム動くため、吸着先も
        // 毎フレーム変わり、ガイドが実位置とずれたまま凍り付く
        const canvas = canvasRectRef.current
        const panning =
          drag.moved && canvas !== null && edgePanDelta({ x: e.clientX, y: e.clientY }, canvas) !== null
        if (panning) {
          setCenter(raw)
          setGuides([])
        } else {
          const snapped = applySnap(raw)
          setCenter(clampCenter(snapped.center))
          setGuides(toScreenGuides(snapped.guides))
        }
        // 自動パンはドラッグ確定後のみ。端ゾーンで掴んだだけのタップでパンさせない
        if (drag.moved) edgePan.update(e.clientX, e.clientY, canvas)
        return
      }

      // リサイズは論理座標で計算する。掴んだ反対側エッジは論理位置が動かない
      const dx = (e.clientX - drag.startX) / t.scale
      const dy = (e.clientY - drag.startY) / t.scale
      const limits = {
        minW: minSizeRef.current.width,
        minH: minSizeRef.current.height,
        max: GHOST_MAX_SIZE,
      }
      const resized = resizeRect(drag.startRect, drag.handle, dx, dy, limits)
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
      dragRef.current = { kind: 'none' }
      edgePan.stop()
      setIsDragging(false)
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
  }, [active, applySnap, clampCenter, toScreenCenter, toScreenGuides, edgePan])

  // 実測したキャンバス矩形(ref)から描画用の論理矩形を導く。state に持たせると
  // 実測 → setState → 再描画 の1往復が挟まり、ゴーストが1フレーム遅れて出る
  // eslint-disable-next-line react-hooks/refs
  const logicalRect = center ? toLogicalRect(center, logicalSize) : null
  const blockReason = logicalRect && getBlockReason ? getBlockReason(logicalRect) : null
  const blocked = blockReason !== null

  // viewBox 座標 → 画面座標の写像原点。ref を経由せず
  // 「ゴースト中心(画面)= 論理矩形中心(viewBox)」の対応から起こす
  const screenOrigin =
    center && logicalRect
      ? {
          x: center.x - (logicalRect.x + logicalRect.w / 2) * transform.scale,
          y: center.y - (logicalRect.y + logicalRect.h / 2) * transform.scale,
        }
      : null

  // 重なった障害物を画面座標へ移す。ゴースト層の強調表示用
  const screenBlockedRects =
    blockReason && screenOrigin
      ? blockReason.rects.map((r) => ({
          left: screenOrigin.x + r.x * transform.scale,
          top: screenOrigin.y + r.y * transform.scale,
          width: r.w * transform.scale,
          height: r.h * transform.scale,
        }))
      : []

  // 表示寸法は実寸×scale(最小44pxのみ保証)。表示と当たり判定を等尺にする —
  // 縮小表示は「見た目は重なっていないのに置けない」を生むため上限クランプは廃止した
  const displaySize = clampGhostDisplaySize({
    width: logicalSize.width * transform.scale,
    height: logicalSize.height * transform.scale,
  })

  const screenRect = center
    ? {
        left: center.x - displaySize.width / 2,
        top: center.y - displaySize.height / 2,
        width: displaySize.width,
        height: displaySize.height,
      }
    : null

  const commit = useCallback((): Rect | null => {
    const cur = centerRef.current
    if (!cur) return null
    const rect = toLogicalRect(cur, sizeRef.current)
    if (!rect) return null
    // 確定時にもう一度スナップを掛ける。ゴーストを触らずキャンバス側を動かして位置を
    // 合わせた場合、ドラッグ中に計算した吸着結果は既に古いため
    const snap = computeSnap(rect, siblingsRef.current, snapThreshold(rect, transformRef.current.scale))
    return { ...rect, x: snap.x, y: snap.y }
  }, [toLogicalRect])

  return {
    screenRect,
    logicalRect,
    screenGuides: guides,
    blocked,
    blockReason,
    screenBlockedRects,
    isDragging,
    onGhostPointerDown,
    onHandlePointerDown,
    commit,
  }
}

