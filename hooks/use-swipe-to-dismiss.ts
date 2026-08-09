// ボトムシートを全領域スワイプで閉じる汎用ジェスチャーフック
// - シート内どこからでも開始。内部スクロールが上端以外の間は内部スクロール優先(コミット保留)
// - 下方向優勢の移動量が閾値(シート高×thresholdRatio)超、またはフリック速度超で閉じる
// - タップ・上方向・水平優勢は disarm(タップ/横スワイプに干渉しない)
// 責務分離: ゲート判定=scrollGate / 速度=swipeVelocity / 背景連鎖遮断=sheetBackgroundGuard。本フックは状態機械のみ。
import { useCallback, useEffect, useRef, useState } from 'react'
import { triggerHaptic, type HapticType } from '@/lib/haptic'
import { safeSetPointerCapture } from '@/lib/gesture/pointer-capture'
import { suppressGhostClick } from '@/lib/gesture/suppress-ghost-click'
import { computeScrollGate } from '@/lib/gesture/scroll-gate'
import { attachSheetBackgroundGuard } from '@/lib/gesture/sheet-background-guard'
import {
  pushVelocitySample,
  computeFlickVelocity,
  type VelocitySample,
} from '@/lib/gesture/swipe-velocity'

interface UseSwipeToDismissOptions {
  onDismiss: () => void
  // 閉じると判定する移動量のシート高に対する比率
  thresholdRatio?: number
  // 閉じると判定するフリック速度(px/ms)
  flickVelocityPxMs?: number
  // 閉じ確定時の触覚強度(既定 medium。開閉で強度を揃えたいシートは light を渡す)
  dismissHapticType?: HapticType
  // false の間はジェスチャーを受け付けない(PC 幅・閉じているシート等)。
  // 進行中のドラッグは打ち切り、追従した transform も残さない
  enabled?: boolean
}

interface SheetHandlers {
  // シート root へ attach(背景スクロール連鎖ガードを登録)
  ref: (node: HTMLElement | null) => void
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerCancel: (e: React.PointerEvent) => void
}

interface UseSwipeToDismissResult {
  dragOffset: number
  isDragging: boolean
  sheetHandlers: SheetHandlers
  // 追従対象へ merge する transform / transition スタイル
  dragStyle: {
    transform: string | undefined
    transition: string
    willChange: 'transform' | undefined
  }
  resetDrag: () => void
}

interface ArmedState {
  pointerId: number
  startX: number
  startY: number
  // 開始位置がスクロール途中の要素上にあり内部スクロールを優先すべきか(コミット保留)
  gateBlocked: boolean
}

// 確定前の「様子見」を許容する遊び幅(px)
const COMMIT_SLOP = 10

// シート要素へ命令的に transform を反映(instant=true でスナップし transition を殺す)
function driveTransform(node: HTMLElement | null, transform: string, instant: boolean): void {
  if (!node) return
  if (instant) node.style.transition = 'none'
  node.style.transform = transform
}

export function useSwipeToDismiss({
  onDismiss,
  thresholdRatio = 0.28,
  flickVelocityPxMs = 0.7,
  dismissHapticType = 'medium',
  enabled = true,
}: UseSwipeToDismissOptions): UseSwipeToDismissResult {
  // 追従は毎フレーム再レンダーを避け ref+命令的 transform で駆動(重いシート内容のカクつき防止)。
  // isDragging state はコミット/終了の2回のみ更新。
  const [isDragging, setIsDragging] = useState(false)
  const armedRef = useRef<ArmedState | null>(null)
  const isDraggingRef = useRef(false)
  const samplesRef = useRef<VelocitySample[]>([])
  const dragOffsetRef = useRef(0)
  const sheetNodeRef = useRef<HTMLElement | null>(null)
  // 横優勢で放棄後、pointerup 後の合成 click を1回抑止(WKWebView 誤クリック対策)
  const suppressClickOnUpRef = useRef(false)
  // 横優勢で放棄したポインター。以降の move/up/cancel は stopPropagation せず window まで通し、
  // シート内の横ジェスチャー(framer-motion drag 等の window リスナー)へ委ねる
  const releasedPointerIdRef = useRef<number | null>(null)
  const rootGuardCleanupRef = useRef<(() => void) | null>(null)

  const setSheetRootRef = useCallback((node: HTMLElement | null) => {
    rootGuardCleanupRef.current?.()
    sheetNodeRef.current = node
    rootGuardCleanupRef.current = node ? attachSheetBackgroundGuard(node) : null
  }, [])

  // ジェスチャーを未確定へ戻す(タップ・横スワイプ・キャンセル時)
  const disarm = useCallback(() => {
    armedRef.current = null
    isDraggingRef.current = false
    samplesRef.current = []
    setIsDragging(false)
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // 無効時は stopPropagation もせず完全に素通しする
      if (!enabled) return
      e.stopPropagation()
      // タッチ・ペン専用(マウスドラッグ・テキスト選択の誤動作を防ぐ)
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return

      // data-drag-handle 起点はゲート免除(ハンドルバーは常に閉じ操作優先)。ここでは capture も触覚も出さない
      const fromHandle =
        e.target instanceof Element && e.target.closest('[data-drag-handle]') !== null
      armedRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        gateBlocked: fromHandle ? false : computeScrollGate(e.target, e.currentTarget),
      }
      isDraggingRef.current = false
      samplesRef.current = []
      releasedPointerIdRef.current = null
    },
    [enabled]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return
      // 横優勢で放棄済みのポインターは素通し(stopPropagation すると window リスナー型の
      // 横ジェスチャー(framer-motion drag='x' 等)へイベントが届かず握り潰してしまう)
      if (releasedPointerIdRef.current === e.pointerId) return
      // 判定前・内部スクロール中も含め親のパンを抑止する
      e.stopPropagation()

      const armed = armedRef.current
      if (!armed || armed.pointerId !== e.pointerId) return

      const dy = e.clientY - armed.startY
      const dx = e.clientX - armed.startX

      // 確定済み: オフセットを命令的に反映(再レンダーなし)+ 速度サンプル蓄積
      if (isDraggingRef.current) {
        dragOffsetRef.current = Math.max(0, dy - COMMIT_SLOP)
        driveTransform(sheetNodeRef.current, `translateY(${dragOffsetRef.current}px)`, false)
        pushVelocitySample(samplesRef.current, { t: performance.now(), y: e.clientY })
        return
      }

      // 水平優勢: 放棄+released(横は内部ジェスチャーの領分。scroll gate より先に判定しないと
      // スクロール後の gate 残留で released 登録に到達できず横ジェスチャーが死ぬ)
      if (Math.abs(dx) > COMMIT_SLOP && Math.abs(dx) > Math.abs(dy)) {
        suppressClickOnUpRef.current = true
        releasedPointerIdRef.current = e.pointerId
        disarm()
        return
      }

      // 上方向優勢: 放棄+released(閉じ対象外。released にしないと上ドリフトから横へ転じる
      // ジェスチャー(親指の弧軌道)が window リスナーへ届かず左スワイプだけ失敗する)
      if (dy < -COMMIT_SLOP) {
        releasedPointerIdRef.current = e.pointerId
        disarm()
        return
      }

      // 内部スクロールが上端でない間はコミットせず様子見
      if (armed.gateBlocked) return

      // 下方向優勢: ジェスチャー確定
      if (dy > COMMIT_SLOP && dy > Math.abs(dx)) {
        safeSetPointerCapture(e.currentTarget as HTMLElement, e.pointerId)
        isDraggingRef.current = true
        setIsDragging(true)
        triggerHaptic('light')
        samplesRef.current = [{ t: performance.now(), y: e.clientY }]
        dragOffsetRef.current = Math.max(0, dy - COMMIT_SLOP)
        driveTransform(sheetNodeRef.current, `translateY(${dragOffsetRef.current}px)`, true)
        return
      }
    },
    [disarm, enabled]
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return
      // 横優勢で放棄済み: 委譲先ジェスチャーの終了処理が window で受けられるよう素通し。
      // 合成 click の貫通抑止のみ実施して終了
      if (releasedPointerIdRef.current === e.pointerId) {
        releasedPointerIdRef.current = null
        if (suppressClickOnUpRef.current) {
          suppressClickOnUpRef.current = false
          suppressGhostClick()
        }
        return
      }
      e.stopPropagation()

      // 横スワイプ放棄後の合成 click 貫通を1回抑止(disarm 済みでも実行)
      if (suppressClickOnUpRef.current) {
        suppressClickOnUpRef.current = false
        suppressGhostClick()
      }

      const armed = armedRef.current
      if (!armed || armed.pointerId !== e.pointerId) return

      // 未確定のまま離指 = タップ等。閉じ判定しない
      if (!isDraggingRef.current) {
        disarm()
        return
      }

      const sheetHeight = (e.currentTarget as HTMLElement).getBoundingClientRect().height
      const velocity = computeFlickVelocity(samplesRef.current)
      const shouldDismiss =
        dragOffsetRef.current > sheetHeight * thresholdRatio || velocity > flickVelocityPxMs

      // ドラッグ直後の合成 click がコンテンツボタンを誤発火させるのを防ぐ(閉じ有無に関わらず抑止)
      suppressGhostClick()

      if (shouldDismiss) {
        // 閾値・フリック速度成立で即閉じ。オフセットは維持し親の退場アニメへ委譲
        triggerHaptic(dismissHapticType)
        disarm()
        onDismiss()
        return
      }
      // 不成立: スナップバック(disarm 再レンダーの dragStyle が transition 復帰・transform 解除)
      dragOffsetRef.current = 0
      disarm()
    },
    [thresholdRatio, flickVelocityPxMs, onDismiss, disarm, dismissHapticType, enabled]
  )

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return
      // 横優勢で放棄済み: 委譲先ジェスチャーへキャンセルを届けるため素通し
      if (releasedPointerIdRef.current === e.pointerId) {
        releasedPointerIdRef.current = null
        suppressClickOnUpRef.current = false
        return
      }
      e.stopPropagation()
      // キャンセル時は click が発火しないため抑止予約を破棄
      suppressClickOnUpRef.current = false

      const armed = armedRef.current
      if (!armed || armed.pointerId !== e.pointerId) return
      // ネイティブスクロール等の割り込みに対する安全復帰
      dragOffsetRef.current = 0
      disarm()
    },
    [disarm, enabled]
  )

  const resetDrag = useCallback(() => {
    disarm()
    dragOffsetRef.current = 0
    // 再オープン時に前回位置が残らないよう即クリア(アニメーションなし)
    driveTransform(sheetNodeRef.current, '', true)
  }, [disarm])

  // enabled が false へ落ちた時の後始末。ハンドラーが no-op になるため pointerup を
  // 受け取れず、進行中のドラッグ状態と追従 transform が取り残されるのを防ぐ
  useEffect(() => {
    if (enabled) return
    const hasPendingGesture =
      armedRef.current !== null || isDraggingRef.current || dragOffsetRef.current !== 0
    if (!hasPendingGesture) return
    resetDrag()
  }, [enabled, resetDrag])

  // ドラッグ量は指に追従させるため再レンダーを挟まず driveTransform で DOM を直接動かしており、
  // ここで返すのはその取りこぼし用フォールバック。react-hooks/refs が禁じるレンダー中の ref 読み取りに
  // 当たるが、state 化すると 1 フレームごとに再レンダーが走り追従が崩れる(移植元の設計意図そのもの)
  /* eslint-disable react-hooks/refs */
  return {
    dragOffset: dragOffsetRef.current,
    isDragging,
    sheetHandlers: {
      ref: setSheetRootRef,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
    dragStyle: {
      transform: dragOffsetRef.current ? `translateY(${dragOffsetRef.current}px)` : undefined,
      transition: isDragging ? 'none' : 'transform 0.2s ease-out',
      willChange: isDragging ? 'transform' : undefined,
    },
    resetDrag,
  }
  /* eslint-enable react-hooks/refs */
}
