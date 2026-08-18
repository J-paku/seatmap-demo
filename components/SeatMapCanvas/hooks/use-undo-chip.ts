import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { RecentPlacement, UndoChipRequest, UndoChipView } from '../type'
import type { Transform } from '@/utils/layout/geometry'

// 07: 直前アクション対象の直下に出す「元に戻す」チップ。次操作または4秒経過で消える。
//
// 位置は論理座標(viewBox 単位)のまま持ち、画面座標への投影は描画のたびに行う。
// 投影を showAt で焼くと、表示中にパン・ズームしたときチップだけが同じピクセルに釘付けになり、
// 対象が下を滑っていって空きスペースや別のチームを指したまま残る

const DISMISS_MS = 4000
// 対象下端とチップの隙間。画面px固定で、倍率に依らない(投影の後に足す)
const ANCHOR_GAP_PX = 10

type UndoChip = {
  // 投影済みの表示位置。非表示なら null
  view: UndoChipView | null
  // 操作種別ごとの文言(「削除しました」等)
  message: string
  // 同じ寿命で強調する直前の配置対象
  recent: RecentPlacement | null
  showAt: (request: UndoChipRequest) => void
  dismiss: () => void
}

const project = (req: UndoChipRequest, t: Transform): UndoChipView => ({
  // ANCHOR_GAP_PX が t.scale の外にあることが要点。掛けると隙間が倍率で伸縮する
  chip: {
    x: req.anchor.x * t.scale + t.translateX,
    y: req.anchor.y * t.scale + t.translateY + ANCHOR_GAP_PX,
  },
  frame: req.frame
    ? {
        x: req.frame.x * t.scale + t.translateX,
        y: req.frame.y * t.scale + t.translateY,
        w: req.frame.w * t.scale,
        h: req.frame.h * t.scale,
      }
    : null,
})

// 変換が動いていないフレームで再レンダーを起こさない。同じ変換なら数値は完全一致する
const isSameView = (a: UndoChipView | null, b: UndoChipView): boolean =>
  a !== null &&
  a.chip.x === b.chip.x &&
  a.chip.y === b.chip.y &&
  (a.frame === null) === (b.frame === null) &&
  (a.frame === null ||
    b.frame === null ||
    (a.frame.x === b.frame.x && a.frame.y === b.frame.y && a.frame.w === b.frame.w && a.frame.h === b.frame.h))

export const useUndoChip = (transformRef: RefObject<Transform>): UndoChip => {
  const [req, setReq] = useState<UndoChipRequest | null>(null)
  const [view, setView] = useState<UndoChipView | null>(null)
  const timeoutRef = useRef(0)

  useEffect(() => () => window.clearTimeout(timeoutRef.current), [])

  const dismiss = useCallback(() => {
    setReq(null)
    setView(null)
    window.clearTimeout(timeoutRef.current)
  }, [])

  const showAt = useCallback(
    (request: UndoChipRequest) => {
      setReq(request)
      // 初回の1フレームだけ空白になるのを避けるため、ここで1回だけ同期投影する
      setView(project(request, transformRef.current))
      // 4秒タイマーは新しい showAt のときだけ張り直す(パン・ズームではリセットしない)
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => {
        setReq(null)
        setView(null)
      }, DISMISS_MS)
    },
    [transformRef]
  )

  // 表示中だけ毎フレーム投影し直す。チップの寿命は最長4秒なのでこのループも最長4秒
  useEffect(() => {
    if (!req) return
    let raf = 0
    const tick = () => {
      const next = project(req, transformRef.current)
      setView((prev) => (isSameView(prev, next) ? prev : next))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [req, transformRef])

  // ドラッグ追従エフェクトの依存に入るため、参照ごと安定させる
  return useMemo(
    () => ({ view, message: req?.message ?? '', recent: req?.recent ?? null, showAt, dismiss }),
    [view, req, showAt, dismiss]
  )
}
