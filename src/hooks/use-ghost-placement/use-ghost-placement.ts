import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useGhostDrag } from './use-ghost-drag'
import { useGhostTransform } from './use-ghost-transform'
import { GHOST_MIN_SIZE, ghostDisplaySize } from '@/utils/layout/rect'
import type { Rect } from '@/utils/layout/rect'
import type { ResizeHandle } from '@/utils/layout/resize-anchor'
import { computeSnap, snapThreshold } from '@/utils/layout/snap-guides'
import type { SnapGuide } from '@/utils/layout/snap-guides'
import type { PlacementBlockReason } from '@/utils/layout/layout-rules'

// ビューファインダー式ゴーストの配置モデル。
//
// ゴーストの中心は「画面座標」で持ち、大きさは「viewBox 実寸」で持つ。こうするとキャンバスを
// パン/ズームしてもゴーストは画面上で動かず、下のキャンバス側が動いて位置が合う。
// 指でゴーストを引きずると置きたい場所が指で隠れる、というモバイルの根本問題を、
// カメラのビューファインダーと同じ発想で回避する仕組み。
//
// この入口が持つのは「静止時の位置・寸法」と「描画値の算出」と「確定」の3つだけ。
// 座標系の追跡は use-ghost-transform、掴んでいる間の操作は use-ghost-drag が持つ

type Options = {
  active: boolean
  // viewBox 実寸。再配置のときは現在サイズを渡す
  size: { width: number; height: number }
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

export const useGhostPlacement = ({
  active,
  size,
  minSize = { width: GHOST_MIN_SIZE, height: GHOST_MIN_SIZE },
  siblings,
  blockReason: getBlockReason,
}: Options): GhostPlacement => {
  // 画面座標のゴースト中心
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null)
  // viewBox 実寸。リサイズで変わる
  const [logicalSize, setLogicalSize] = useState(size)
  const [guides, setGuides] = useState<SnapGuide[]>([])

  const centerRef = useRef<{ x: number; y: number } | null>(null)
  const sizeRef = useRef(size)
  const siblingsRef = useRef(siblings)
  const minSizeRef = useRef(minSize)

  // ポインタ/rAF ハンドラは「今の値」を読む必要がある。effect へ移すと、同じコミットで
  // 張ったハンドラが1フレーム古い値を掴んでドラッグが1フレーム遅れて追従する
  /* eslint-disable react-hooks/refs */
  siblingsRef.current = siblings
  centerRef.current = center
  sizeRef.current = logicalSize
  minSizeRef.current = minSize
  /* eslint-enable react-hooks/refs */

  // 変換が動いたときの通知先。ドラッグ中は引き直さない(掴んでいる側が毎フレーム更新している)。
  // 中身は view / drag の初期化より後で確定するので、呼び出しは ref 経由に留める
  const refreshGuidesRef = useRef<() => void>(() => {})
  const onViewChange = useCallback(() => refreshGuidesRef.current(), [])

  const view = useGhostTransform({ active, onViewChange })
  const { transform, transformRef, toLogicalRect, toScreenGuides, readCanvasRect, readInitial } = view

  // 論理矩形へスナップを掛け、そのぶん画面中心をずらす
  const applySnap = useCallback(
    (screenCenter: { x: number; y: number }) => {
      const rect = toLogicalRect(screenCenter, sizeRef.current)
      if (!rect) return { center: screenCenter, guides: [] as SnapGuide[] }
      const t = transformRef.current
      const snap = computeSnap(rect, siblingsRef.current, snapThreshold(rect, t.scale))
      return {
        center: { x: screenCenter.x + (snap.x - rect.x) * t.scale, y: screenCenter.y + (snap.y - rect.y) * t.scale },
        guides: snap.guides,
      }
    },
    [toLogicalRect, transformRef]
  )

  const drag = useGhostDrag({
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
  })

  // ガイドだけを引き直す。中心には触れない。
  // パン・ズームで論理位置が変わると吸着相手も変わるため、「確定したらここへ吸着する」の
  // 予告としてガイドだけを更新する。実際の吸着は commit() が最後に一度だけ適用する
  const { isGrabbing, reset: resetDrag } = drag
  const refreshGuides = useCallback(() => {
    if (isGrabbing()) return
    const held = centerRef.current
    if (!held) return
    setGuides(toScreenGuides(applySnap(held).guides))
  }, [applySnap, toScreenGuides, isGrabbing])
  // eslint-disable-next-line react-hooks/refs
  refreshGuidesRef.current = refreshGuides

  // 起動時: キャンバス矩形と変換を実測し、初期位置を決める。
  // 非活性化時の後始末も同じ effect が持つ(実測値は描画中には作れない)
  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCenter(null)
      setGuides([])
      // ドラッグ中に配置がキャンセルされた場合、掴み状態を焼き付かせない
      resetDrag()
      return
    }
    const canvas = readInitial()
    if (!canvas) return
    // サイズ上書きはここでリセットする(前回のリサイズ結果を引きずらない)
    sizeRef.current = size
    setLogicalSize(size)
    // 新規配置か掴み直しかに関わらず、初期中心は常にキャンバス矩形の中心。
    // 実体の真上に湧かせると一拍のあいだどちらが実体か判別できず、
    // 「地図の側を動かして狙いを合わせる」という操作モデルが移動では成立しなくなる。
    // ここでクランプは掛けない — 素のキャンバス中心をそのまま置く
    setCenter({ x: canvas.left + canvas.width / 2, y: canvas.top + canvas.height / 2 })
    // 依存に drag の object を入れない。毎レンダー参照が変わると起動 effect が毎回走り、
    // ドラッグしても手を離すたびにゴーストが中央へ戻る
  }, [active, size, readInitial, resetDrag])

  // 実測したキャンバス矩形(ref)から描画用の論理矩形を導く。state に持たせると
  // 実測 → setState → 再描画 の1往復が挟まり、ゴーストが1フレーム遅れて出る
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
  }, [toLogicalRect, readCanvasRect, transformRef])

  return {
    screenRect,
    logicalRect,
    screenGuides: guides,
    blocked,
    blockReason,
    screenBlockedRects,
    isDragging: drag.isDragging,
    resizingHandle: drag.resizingHandle,
    onGhostPointerDown: drag.onGhostPointerDown,
    onHandlePointerDown: drag.onHandlePointerDown,
    commit,
  }
}
