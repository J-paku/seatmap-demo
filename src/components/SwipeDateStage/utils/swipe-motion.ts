import type { SwipeDirection, SwipeStageRefs } from '../type'

// 実測しきい値(04-date-navigator.md準拠)
export const SLOP = 12
export const COMMIT_DISTANCE = 56
export const FLICK_SPEED = 0.45 // px/ms
export const SNAP_MS = 180

const RESIST_START = 112
const RESIST_FACTOR = 0.15
const MAX_TILT_DEG = 8
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

const SNAP_TRANSFORM = `transform ${SNAP_MS}ms ${EASING}`
const SNAP_TRANSFORM_OPACITY = `transform ${SNAP_MS}ms ${EASING}, opacity ${SNAP_MS}ms ${EASING}`

// 移動量を RESIST_START で 0〜1 に均した進み具合。逆向き(負)の移動量は 0 になる
const progressOf = (distance: number): number => Math.min(Math.max(distance, 0) / RESIST_START, 1)

// 指の移動量にゴム抵抗をかけつつ、カード・奥行き・スタンプへ一括で反映する
export const applyFollowStyles = (refs: SwipeStageRefs, dx: number, transition: boolean): void => {
  const card = refs.cardRef.current
  if (!card) return

  const abs = Math.abs(dx)
  // RESIST_START までは指どおり、超えた分だけ RESIST_FACTOR 倍に縮める。
  // 境目では両側が同じ値になるので、比較の分岐ではなく min/max で書く
  const resisted =
    Math.sign(dx) * (Math.min(abs, RESIST_START) + Math.max(abs - RESIST_START, 0) * RESIST_FACTOR)
  const ratio = progressOf(abs)
  const tilt = (resisted / RESIST_START) * MAX_TILT_DEG

  card.style.transition = transition ? SNAP_TRANSFORM : 'none'
  card.style.transformOrigin = 'center bottom'
  card.style.transform = `translateX(${resisted}px) rotate(${tilt}deg)`

  const depth = refs.depthRef.current
  if (depth) {
    depth.style.transition = transition ? SNAP_TRANSFORM_OPACITY : 'none'
    depth.style.transform = `scale(${0.9 + 0.1 * ratio})`
    depth.style.opacity = String(ratio)
  }

  // 右スワイプ=前日スタンプ・左スワイプ=翌日スタンプ。反対側のスタンプは進み具合 0(透明・縮小)になる
  const applyStamp = (el: HTMLDivElement | null, progress: number) => {
    if (!el) return
    el.style.transition = transition ? SNAP_TRANSFORM_OPACITY : 'none'
    el.style.opacity = String(progress)
    el.style.transform = `scale(${0.85 + 0.15 * progress})`
  }
  applyStamp(refs.stampPrevRef.current, progressOf(dx))
  applyStamp(refs.stampNextRef.current, progressOf(-dx))
}

// 確定時に画面外へ送り出す
export const applyExitStyles = (
  refs: SwipeStageRefs,
  direction: SwipeDirection,
  stageWidth: number
): void => {
  const card = refs.cardRef.current
  if (card) {
    const exitX = direction === 'prev' ? stageWidth : -stageWidth
    card.style.transition = SNAP_TRANSFORM_OPACITY
    card.style.transform = `translateX(${exitX}px) rotate(${direction === 'prev' ? MAX_TILT_DEG : -MAX_TILT_DEG}deg)`
    card.style.opacity = '0'
  }
  const depth = refs.depthRef.current
  if (depth) {
    depth.style.transition = SNAP_TRANSFORM_OPACITY
    depth.style.transform = 'scale(1)'
    depth.style.opacity = '0'
  }
}

// ペイント前に進入開始位置を仕込む。方向が無い(ボタン・カレンダー由来)ときは移動なしのフェード
export const applyEnterStart = (
  refs: SwipeStageRefs,
  direction: SwipeDirection | null,
  stageWidth: number
): void => {
  const card = refs.cardRef.current
  if (!card) return
  const startX = direction === 'prev' ? -stageWidth : direction === 'next' ? stageWidth : 0
  card.style.transition = 'none'
  card.style.transform = `translateX(${startX}px) rotate(0deg)`
  card.style.opacity = direction ? '0' : '1'
}

// 中央へ戻す(進入アニメーションの着地)
export const applyEnterSettle = (refs: SwipeStageRefs): void => {
  const card = refs.cardRef.current
  if (!card) return
  card.style.transition = SNAP_TRANSFORM_OPACITY
  card.style.transform = 'translateX(0) rotate(0deg)'
  card.style.opacity = '1'
}
