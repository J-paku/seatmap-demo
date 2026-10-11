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

// 指の移動量にゴム抵抗をかけつつ、カード・奥行き・スタンプへ一括で反映する
export const applyFollowStyles = (refs: SwipeStageRefs, dx: number, transition: boolean): void => {
  const card = refs.cardRef.current
  if (!card) return

  const abs = Math.abs(dx)
  const resisted = abs <= RESIST_START ? dx : Math.sign(dx) * (RESIST_START + (abs - RESIST_START) * RESIST_FACTOR)
  const ratio = Math.min(abs / RESIST_START, 1)
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

  // 右スワイプ=前日スタンプ・左スワイプ=翌日スタンプ
  const stampScale = 0.85 + 0.15 * ratio
  const applyStamp = (el: HTMLDivElement | null, active: boolean) => {
    if (!el) return
    el.style.transition = transition ? SNAP_TRANSFORM_OPACITY : 'none'
    el.style.opacity = String(active ? ratio : 0)
    el.style.transform = `scale(${active ? stampScale : 0.85})`
  }
  applyStamp(refs.stampPrevRef.current, dx > 0)
  applyStamp(refs.stampNextRef.current, dx < 0)
}

// 確定時に画面外へ送り出す
export const applyExitStyles = (refs: SwipeStageRefs, direction: SwipeDirection, stageWidth: number): void => {
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
export const applyEnterStart = (refs: SwipeStageRefs, direction: SwipeDirection | null, stageWidth: number): void => {
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
