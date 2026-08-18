import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { SEATMAP_BG_ID } from '@/components/SheetShell'
import { useEdgeAutoPan } from '@/hooks/use-edge-auto-pan'
import { triggerHaptic } from '@/utils/haptic'
import { edgePanDelta } from '@/utils/layout/edge-pan'
import { GHOST_MIN_SIZE, clampGhostCenter, ghostDisplaySize } from '@/utils/layout/rect'
import type { Rect } from '@/utils/layout/rect'
import { resizeRectToPointer } from '@/utils/layout/resize-anchor'
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
  // 枠を掴んで移動している間だけ true
  isDragging: boolean
  // リサイズ中に掴んでいるハンドル。していなければ null。
  // isResizing という真偽値は持たない — 同じ事実を2つの state で持つと必ずずれる
  resizingHandle: ResizeHandle | null
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
  const [resizingHandle, setResizingHandle] = useState<ResizeHandle | null>(null)

  const canvasRectRef = useRef<DOMRect | null>(null)
  const transformRef = useRef<Transform>({ scale: 1, tx: 0, ty: 0 })
  const centerRef = useRef<{ x: number; y: number } | null>(null)
  const sizeRef = useRef(size)
  const siblingsRef = useRef(siblings)
  const dragRef = useRef<DragState>({ kind: 'none' })
  const minSizeRef = useRef(minSize)
  // ポインタキャプチャを取った要素と、そのポインタの最後の画面座標。
  // 2本目の指が降りたときにキャンバスへ引き渡すのに要る(ピンチの引き継ぎ)
  const captureRef = useRef<{ target: Element; x: number; y: number } | null>(null)
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

  // キャンバス矩形は都度実測する。実測が取れないフレームだけ直前値へ落とす
  const readCanvasRect = useCallback((): DOMRect | null => {
    const el = findCanvas()
    if (el) canvasRectRef.current = el.getBoundingClientRect()
    return canvasRectRef.current
  }, [])

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
        ? { ...g, pos: toX(g.pos), start: toY(g.start), end: toY(g.end), extend: g.extend * t.scale }
        : { ...g, pos: toY(g.pos), start: toX(g.start), end: toX(g.end), extend: g.extend * t.scale }
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

  // ガイドだけを引き直す。中心には触れない。
  // パン・ズームで論理位置が変わると吸着相手も変わるため、「確定したらここへ吸着する」の
  // 予告としてガイドだけを更新する。実際の吸着は commit() が最後に一度だけ適用する
  const refreshGuides = useCallback(() => {
    if (dragRef.current.kind !== 'none') return
    const held = centerRef.current
    if (!held) return
    setGuides(toScreenGuides(applySnap(held).guides))
  }, [applySnap, toScreenGuides])

  // 掴み状態を落とす。Esc 中止や2本目の指への引き渡しでも同じ後始末を通す
  const endGrab = useCallback(() => {
    const captured = captureRef.current
    if (captured) {
      const target = captured.target
      if ('releasePointerCapture' in target) {
        try {
          ;(target as Element & { releasePointerCapture: (id: number) => void }).releasePointerCapture(
            dragRef.current.kind === 'none' ? -1 : dragRef.current.pointerId
          )
        } catch {
          // capture 未取得・既に解放済みの場合は無視
        }
      }
    }
    captureRef.current = null
    dragRef.current = { kind: 'none' }
    edgePan.stop()
    setIsDragging(false)
    setResizingHandle(null)
    setGuides([])
  }, [edgePan])

  // 起動時: キャンバス矩形と変換を実測し、初期位置を決める。
  // 非活性化時の後始末も同じ effect が持つ(実測値は描画中には作れない)
  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCenter(null)
      setGuides([])
      dragRef.current = { kind: 'none' }
      captureRef.current = null
      // ドラッグ中に配置がキャンセルされた場合、掴み状態を焼き付かせない
      setIsDragging(false)
      setResizingHandle(null)
      // パンループだけ生き残らせない
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

  // キャンバスの transform を監視する。変換が変わったときにやってよいのは、
  // キャンバス矩形の実測とガイドの引き直しだけ
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
      // ここで中心を書くと、地図を動かすたびにゴーストが吸着先へ滑り、
      // 「画面に固定された枠の下で地図が動く」というこの機構の前提が崩れる
      readCanvasRect()
      refreshGuides()
    })
    observer.observe(layer, { attributes: true, attributeFilter: ['style'] })
    return () => observer.disconnect()
  }, [active, readCanvasRect, refreshGuides])

  // キャンバスの位置は window サイズ以外でも動く。横からシートが開く・アドレスバーが伸縮する・
  // 祖先がスクロールする。どれもウィンドウの resize を起こさないので、この3系統で拾う
  useEffect(() => {
    if (!active) return
    const el = findCanvas()
    if (!el) return
    const refresh = () => {
      const next = el.getBoundingClientRect()
      const prev = canvasRectRef.current
      // 位置も寸法も変わっていない通知でレンダーを起こさない(scroll は毎フレーム飛んでくる)
      if (
        prev &&
        prev.left === next.left &&
        prev.top === next.top &&
        prev.width === next.width &&
        prev.height === next.height
      ) {
        return
      }
      canvasRectRef.current = next
      // 中心は動かさない。ゴーストは画面に固定なので、キャンバスが動いたら論理位置の方が変わる
      refreshGuides()
    }
    const observer = new ResizeObserver(refresh)
    observer.observe(el)
    window.addEventListener('resize', refresh)
    // 第3引数 true = 捕捉フェーズ。祖先のスクロールを1つの購読で拾う
    window.addEventListener('scroll', refresh, true)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', refresh)
      window.removeEventListener('scroll', refresh, true)
    }
  }, [active, refreshGuides])

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
      try {
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      } catch {
        // 実ポインタでない(検証プローブの合成イベント)場合は capture を取れない
      }
      captureRef.current = { target: e.target as Element, x: e.clientX, y: e.clientY }
      setIsDragging(true)
      // §04-1: 掴み = light
      triggerHaptic('light')
    },
    [edgePan, readCanvasRect]
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
      try {
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      } catch {
        // 同上
      }
      captureRef.current = { target: e.target as Element, x: e.clientX, y: e.clientY }
      setResizingHandle(handle)
      // §04-1: リサイズ開始 = light
      triggerHaptic('light')
    },
    [toLogicalRect, edgePan, readCanvasRect]
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
      endGrab()
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
  }, [active, endGrab])

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
  }, [active, applySnap, readCanvasRect, toScreenCenter, toScreenGuides, edgePan])

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

  // フットプリント = 実寸×scale。判定に使う論理矩形と1対1に対応する
  const footprint = {
    width: logicalSize.width * transform.scale,
    height: logicalSize.height * transform.scale,
  }
  // 描画箱。短辺が 44px を割るときだけ等比で持ち上げる(縮小はしない)
  const displaySize = ghostDisplaySize(footprint)

  const screenRect = center
    ? {
        left: center.x - displaySize.width / 2,
        top: center.y - displaySize.height / 2,
        width: displaySize.width,
        height: displaySize.height,
      }
    : null

  const commit = useCallback((): Rect | null => {
    readCanvasRect()
    const cur = centerRef.current
    if (!cur) return null
    const rect = toLogicalRect(cur, sizeRef.current)
    if (!rect) return null
    // 確定時にもう一度スナップを掛ける。ゴーストを触らずキャンバス側を動かして位置を
    // 合わせた場合、ドラッグ中に計算した吸着結果は既に古いため
    const snap = computeSnap(rect, siblingsRef.current, snapThreshold(rect, transformRef.current.scale))
    return { ...rect, x: snap.x, y: snap.y }
  }, [toLogicalRect, readCanvasRect])

  return {
    screenRect,
    logicalRect,
    screenGuides: guides,
    blocked,
    blockReason,
    screenBlockedRects,
    isDragging,
    resizingHandle,
    onGhostPointerDown,
    onHandlePointerDown,
    commit,
  }
}
