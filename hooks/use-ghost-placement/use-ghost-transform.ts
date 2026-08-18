import { useCallback, useEffect, useRef, useState } from 'react'
import { SEATMAP_BG_ID } from '@/components/SheetShell'
import type { Rect } from '@/utils/layout/rect'
import type { SnapGuide } from '@/utils/layout/snap-guides'

// ゴースト配置の「座標系」だけを持つ層。
//
// キャンバスの変換(パン・ズーム)とキャンバス矩形を追い続け、画面 ⇄ viewBox の写像を提供する。
// 変換が変わったときにやってよいのは「キャンバス矩形の実測」と「ガイドの引き直し」だけで、
// ここから中心を書いてはいけない — 書いた瞬間、地図を動かすたびにゴーストが吸着先へ滑り、
// 「画面に固定された枠の下で地図が動く」というこの機構の前提が崩れる。
//
// 変換の取得にキャンバス内部の ref を使わず DOM 属性を監視するのは、ゴースト層を
// キャンバスの DOM 木の外へ置くため

type Transform = { scale: number; tx: number; ty: number }

export type GhostTransform = {
  transform: Transform
  transformRef: React.RefObject<Transform>
  canvasRectRef: React.RefObject<DOMRect | null>
  // キャンバス矩形を今この瞬間で実測する。取れないフレームだけ直前値へ落とす
  readCanvasRect: () => DOMRect | null
  // 起動時の初期化。変換とキャンバス矩形を同期で読む(描画中には作れない実測値)
  readInitial: () => DOMRect | null
  toLogicalRect: (screenCenter: { x: number; y: number }, size: { width: number; height: number }) => Rect | null
  toScreenCenter: (rect: Rect) => { x: number; y: number } | null
  toScreenGuides: (guides: SnapGuide[]) => SnapGuide[]
}

const readTransform = (layer: Element): Transform => {
  const m = new DOMMatrixReadOnly(getComputedStyle(layer).transform)
  return { scale: m.a || 1, tx: m.e, ty: m.f }
}

const findLayer = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[data-canvas-transform-layer="true"]')

export const findCanvas = (): HTMLElement | null => document.getElementById(SEATMAP_BG_ID)

type Options = {
  active: boolean
  // 変換またはキャンバス矩形が動いたときの通知。ガイドの引き直しだけを行う口
  onViewChange: () => void
}

export const useGhostTransform = ({ active, onViewChange }: Options): GhostTransform => {
  const [transform, setTransform] = useState<Transform>({ scale: 1, tx: 0, ty: 0 })
  const transformRef = useRef<Transform>({ scale: 1, tx: 0, ty: 0 })
  const canvasRectRef = useRef<DOMRect | null>(null)

  // ポインタ/rAF ハンドラは「今の値」を読む必要がある。effect へ移すと、同じコミットで
  // 張ったハンドラが1フレーム古い値を掴んでドラッグが1フレーム遅れて追従する
  // eslint-disable-next-line react-hooks/refs
  transformRef.current = transform

  const readCanvasRect = useCallback((): DOMRect | null => {
    const el = findCanvas()
    if (el) canvasRectRef.current = el.getBoundingClientRect()
    return canvasRectRef.current
  }, [])

  const readInitial = useCallback((): DOMRect | null => {
    const canvas = findCanvas()
    const layer = findLayer()
    if (!canvas || !layer) return null
    canvasRectRef.current = canvas.getBoundingClientRect()
    const t = readTransform(layer)
    transformRef.current = t
    setTransform(t)
    return canvasRectRef.current
  }, [])

  // 画面座標 → viewBox 座標
  const toLogicalRect = useCallback(
    (screenCenter: { x: number; y: number }, size: { width: number; height: number }): Rect | null => {
      const canvas = canvasRectRef.current
      if (!canvas) return null
      const t = transformRef.current
      const cx = (screenCenter.x - canvas.left - t.tx) / t.scale
      const cy = (screenCenter.y - canvas.top - t.ty) / t.scale
      return { x: cx - size.width / 2, y: cy - size.height / 2, w: size.width, h: size.height }
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

  // キャンバスの transform を監視する
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
      readCanvasRect()
      onViewChange()
    })
    observer.observe(layer, { attributes: true, attributeFilter: ['style'] })
    return () => observer.disconnect()
  }, [active, readCanvasRect, onViewChange])

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
      onViewChange()
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
  }, [active, onViewChange])

  return {
    transform,
    transformRef,
    canvasRectRef,
    readCanvasRect,
    readInitial,
    toLogicalRect,
    toScreenCenter,
    toScreenGuides,
  }
}
