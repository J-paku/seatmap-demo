import { useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { useEnterAnimation } from './use-enter-animation'
import {
  COMMIT_DISTANCE,
  FLICK_SPEED,
  SLOP,
  SNAP_MS,
  applyExitStyles,
  applyFollowStyles,
} from '../utils/swipe-motion'
import type { SwipeDirection, SwipeStageRefs } from '../type'

// 横スワイプで前日/翌日へ移すジェスチャー。追従は高頻度なので直接style操作に隔離し、
// 親の再レンダーを起こさない

type Options = {
  cardKey: string
  onSwipePrevDay: () => void
  onSwipeNextDay: () => void
}

type SwipeHandlers = {
  onPointerDown: (e: ReactPointerEvent) => void
  onPointerMove: (e: ReactPointerEvent) => void
  onPointerUp: (e: ReactPointerEvent) => void
  onPointerCancel: () => void
  onClickCapture: (e: ReactMouseEvent) => void
}

// refs はそのままJSXの ref= に渡せるよう個別に返す(まとめ物のプロパティ経由で渡さない)
type Result = SwipeStageRefs & {
  handlers: SwipeHandlers
}

// 直近100msの速度からフリック量を求める
const flickSpeed = (samples: Array<{ x: number; t: number }>, now: number): number => {
  const recent = samples.filter((s) => now - s.t <= 100)
  if (recent.length < 2) return 0
  const a = recent[0]
  const b = recent[recent.length - 1]
  return (b.x - a.x) / Math.max(1, b.t - a.t)
}

export const useDateSwipe = ({ cardKey, onSwipePrevDay, onSwipeNextDay }: Options): Result => {
  const stageRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const depthRef = useRef<HTMLDivElement>(null)
  const stampPrevRef = useRef<HTMLDivElement>(null)
  const stampNextRef = useRef<HTMLDivElement>(null)
  // 進入アニメーションのエフェクト依存に入るため、参照ごと固定しておく
  const refs = useMemo<SwipeStageRefs>(
    () => ({ stageRef, cardRef, depthRef, stampPrevRef, stampNextRef }),
    []
  )

  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle')
  // 進入方向(次にDOM反映される children がどちら側から入るか)。スワイプ確定時のみ設定
  const enterDirRef = useRef<SwipeDirection | null>(null)
  useEnterAnimation(cardKey, refs, enterDirRef, setPhase)

  const drag = useRef({
    committed: false,
    abandoned: false,
    startX: 0,
    startY: 0,
    samples: [] as Array<{ x: number; t: number }>,
    suppressClick: false,
  })

  const suppressNextClick = () => {
    drag.current.suppressClick = true
    window.setTimeout(() => {
      drag.current.suppressClick = false
    }, 0)
  }

  const finishAsSnapback = () => {
    applyFollowStyles(refs, 0, true)
    const d = drag.current
    d.committed = false
    if (d.abandoned) suppressNextClick()
  }

  const commitSwipe = (direction: SwipeDirection) => {
    // ライトハプティクス(非対応環境では無視)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(8)
    const stageWidth = refs.stageRef.current?.offsetWidth ?? window.innerWidth
    setPhase('exit')
    applyExitStyles(refs, direction, stageWidth)
    window.setTimeout(() => {
      // 反対側から進入させるための方向を記録してから日付を確定する(useEnterAnimation が参照)
      enterDirRef.current = direction
      if (direction === 'prev') onSwipePrevDay()
      else onSwipeNextDay()
    }, SNAP_MS)
    suppressNextClick()
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse') return
    if (phase !== 'idle') return
    const d = drag.current
    d.committed = false
    d.abandoned = false
    d.startX = e.clientX
    d.startY = e.clientY
    d.samples = [{ x: e.clientX, t: e.timeStamp }]
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse') return
    const d = drag.current
    if (d.abandoned) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    d.samples.push({ x: e.clientX, t: e.timeStamp })
    if (d.samples.length > 12) d.samples.shift()

    if (!d.committed) {
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      // スロップ以内は無反応
      if (absDx <= SLOP && absDy <= SLOP) return
      // 縦優勢: 即座に放棄しスクロールへ委譲
      if (absDy > SLOP && absDy >= absDx) {
        d.abandoned = true
        return
      }
      // 横優勢(縦の2倍超)のときのみ確定
      if (absDx > SLOP && absDx > absDy * 2) {
        d.committed = true
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      } else {
        return
      }
    }
    applyFollowStyles(refs, dx, false)
  }

  const onPointerUp = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse') return
    const d = drag.current
    if (!d.committed) {
      if (d.abandoned) suppressNextClick()
      return
    }
    const dx = e.clientX - d.startX
    const shouldCommit =
      Math.abs(dx) >= COMMIT_DISTANCE || Math.abs(flickSpeed(d.samples, e.timeStamp)) >= FLICK_SPEED
    // 右スワイプ(dx>0)=前日・左スワイプ(dx<0)=翌日
    if (shouldCommit) commitSwipe(dx > 0 ? 'prev' : 'next')
    else finishAsSnapback()
  }

  const onClickCapture = (e: ReactMouseEvent) => {
    if (drag.current.suppressClick) {
      e.stopPropagation()
      e.preventDefault()
    }
  }

  return {
    stageRef,
    cardRef,
    depthRef,
    stampPrevRef,
    stampNextRef,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: finishAsSnapback, onClickCapture },
  }
}
