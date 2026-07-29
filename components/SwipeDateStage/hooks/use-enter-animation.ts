import { useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { SNAP_MS, applyEnterSettle, applyEnterStart } from '../utils/swipe-motion'
import type { SwipeDirection, SwipePhase, SwipeStageRefs } from '../type'

// 外部から date が変わった(スワイプ以外=ボタン・カレンダー由来含む)ら enter 演出のみ再生する。
// DOM ノード自体は再マウントせず(children ref 安定・スワイプ追従の直接style操作と整合させる)、
// ペイント前に開始位置を仕込んでから中央へアニメーションする
export const useEnterAnimation = (
  cardKey: string,
  refs: SwipeStageRefs,
  enterDirRef: RefObject<SwipeDirection | null>,
  setPhase: (phase: SwipePhase) => void
): void => {
  const prevKeyRef = useRef(cardKey)

  useLayoutEffect(() => {
    if (cardKey === prevKeyRef.current) return
    prevKeyRef.current = cardKey
    const stageWidth = refs.stageRef.current?.offsetWidth ?? window.innerWidth
    const direction = enterDirRef.current
    enterDirRef.current = null

    applyEnterStart(refs, direction, stageWidth)
    setPhase('enter')

    const frame = window.requestAnimationFrame(() => applyEnterSettle(refs))
    const timer = window.setTimeout(() => setPhase('idle'), SNAP_MS + 20)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [cardKey, refs, enterDirRef, setPhase])
}
