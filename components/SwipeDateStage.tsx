import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type Props = {
  // 変化を検知するための識別子(選択日のキー)。DOMノードは再マウントせず direct style で演出する
  cardKey: string
  onSwipePrevDay: () => void
  onSwipeNextDay: () => void
  children: ReactNode
}

// 実測しきい値(04-date-navigator.md準拠)
const SLOP = 12
const RESIST_START = 112
const RESIST_FACTOR = 0.15
const MAX_TILT_DEG = 8
const COMMIT_DISTANCE = 56
const FLICK_SPEED = 0.45 // px/ms
const SNAP_MS = 180
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

type Phase = 'idle' | 'exit' | 'enter'

// スワイプ追従は高頻度なため、直接style操作でこのコンポーネント内に隔離し、親の再レンダーを防ぐ
export const SwipeDateStage = ({ cardKey, onSwipePrevDay, onSwipeNextDay, children }: Props) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const depthRef = useRef<HTMLDivElement>(null)
  const stampPrevRef = useRef<HTMLDivElement>(null)
  const stampNextRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const [phase, setPhase] = useState<Phase>('idle')
  // 進入方向(次にDOM反映される children がどちら側から入るか)。スワイプ確定時のみ設定
  const enterDirRef = useRef<'prev' | 'next' | null>(null)
  const prevKeyRef = useRef(cardKey)

  const drag = useRef({
    committed: false,
    abandoned: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    samples: [] as Array<{ x: number; t: number }>,
    suppressClick: false,
  })

  // 外部から date が変わった(スワイプ以外=ボタン・カレンダー由来含む)ら enter 演出のみ再生
  // DOM ノード自体は再マウントせず(children ref 安定・スワイプ追従の直接style操作と整合させる)、
  // ペイント前に開始位置を仕込んでから中央へアニメーションする
  useLayoutEffect(() => {
    if (cardKey === prevKeyRef.current) return
    prevKeyRef.current = cardKey
    const el = cardRef.current
    const stageWidth = stageRef.current?.offsetWidth ?? window.innerWidth
    const dir = enterDirRef.current
    enterDirRef.current = null

    if (el) {
      // スワイプ確定由来なら反対側からスライドイン、ボタン/カレンダー由来ならフェード+微小移動で入る
      const startX = dir === 'prev' ? -stageWidth : dir === 'next' ? stageWidth : 0
      el.style.transition = 'none'
      el.style.transform = `translateX(${startX}px) rotate(0deg)`
      el.style.opacity = dir ? '0' : '1'
    }
    setPhase('enter')
    const id = window.requestAnimationFrame(() => {
      const card = cardRef.current
      if (!card) return
      card.style.transition = `transform ${SNAP_MS}ms ${EASING}, opacity ${SNAP_MS}ms ${EASING}`
      card.style.transform = 'translateX(0) rotate(0deg)'
      card.style.opacity = '1'
    })
    const timer = window.setTimeout(() => setPhase('idle'), SNAP_MS + 20)
    return () => {
      window.cancelAnimationFrame(id)
      window.clearTimeout(timer)
    }
  }, [cardKey])

  // ライトハプティクス(非対応環境では無視)
  const lightHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(8)
  }

  const setFollowStyles = (dx: number, transition: boolean) => {
    const card = cardRef.current
    const depth = depthRef.current
    const stampPrev = stampPrevRef.current
    const stampNext = stampNextRef.current
    if (!card) return

    const abs = Math.abs(dx)
    const resisted = abs <= RESIST_START ? dx : Math.sign(dx) * (RESIST_START + (abs - RESIST_START) * RESIST_FACTOR)
    const ratio = Math.min(abs / RESIST_START, 1)
    const tilt = (resisted / RESIST_START) * MAX_TILT_DEG

    card.style.transition = transition ? `transform ${SNAP_MS}ms ${EASING}` : 'none'
    card.style.transformOrigin = 'center bottom'
    card.style.transform = `translateX(${resisted}px) rotate(${tilt}deg)`

    if (depth) {
      depth.style.transition = transition ? `transform ${SNAP_MS}ms ${EASING}, opacity ${SNAP_MS}ms ${EASING}` : 'none'
      const scale = 0.9 + 0.1 * ratio
      depth.style.transform = `scale(${scale})`
      depth.style.opacity = String(ratio)
    }
    // 右スワイプ=前日スタンプ・左スワイプ=翌日スタンプ
    const stampScale = 0.85 + 0.15 * ratio
    if (stampPrev) {
      stampPrev.style.transition = transition ? `transform ${SNAP_MS}ms ${EASING}, opacity ${SNAP_MS}ms ${EASING}` : 'none'
      const r = dx > 0 ? ratio : 0
      stampPrev.style.opacity = String(r)
      stampPrev.style.transform = `scale(${dx > 0 ? stampScale : 0.85})`
    }
    if (stampNext) {
      stampNext.style.transition = transition ? `transform ${SNAP_MS}ms ${EASING}, opacity ${SNAP_MS}ms ${EASING}` : 'none'
      const r = dx < 0 ? ratio : 0
      stampNext.style.opacity = String(r)
      stampNext.style.transform = `scale(${dx < 0 ? stampScale : 0.85})`
    }
  }

  const resetStyles = (transition: boolean) => {
    setFollowStyles(0, transition)
  }

  const suppressNextClick = () => {
    drag.current.suppressClick = true
    window.setTimeout(() => {
      drag.current.suppressClick = false
    }, 0)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return
    if (phase !== 'idle') return
    const d = drag.current
    d.committed = false
    d.abandoned = false
    d.startX = e.clientX
    d.startY = e.clientY
    d.lastX = e.clientX
    d.samples = [{ x: e.clientX, t: e.timeStamp }]
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return
    const d = drag.current
    if (d.abandoned) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    d.lastX = e.clientX
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
    setFollowStyles(dx, false)
  }

  const finishAsSnapback = () => {
    resetStyles(true)
    const d = drag.current
    d.committed = false
    if (d.abandoned) suppressNextClick()
  }

  const commitSwipe = (direction: 'prev' | 'next') => {
    lightHaptic()
    const card = cardRef.current
    const stageWidth = stageRef.current?.offsetWidth ?? window.innerWidth
    setPhase('exit')
    if (card) {
      const exitX = direction === 'prev' ? stageWidth : -stageWidth
      card.style.transition = `transform ${SNAP_MS}ms ${EASING}, opacity ${SNAP_MS}ms ${EASING}`
      card.style.transform = `translateX(${exitX}px) rotate(${direction === 'prev' ? MAX_TILT_DEG : -MAX_TILT_DEG}deg)`
      card.style.opacity = '0'
    }
    const depth = depthRef.current
    if (depth) {
      depth.style.transition = `transform ${SNAP_MS}ms ${EASING}, opacity ${SNAP_MS}ms ${EASING}`
      depth.style.transform = 'scale(1)'
      depth.style.opacity = '0'
    }
    window.setTimeout(() => {
      // 反対側から進入させるための方向を記録してから日付を確定する(useLayoutEffectが参照)
      enterDirRef.current = direction
      if (direction === 'prev') onSwipePrevDay()
      else onSwipeNextDay()
    }, SNAP_MS)
    suppressNextClick()
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return
    const d = drag.current
    if (!d.committed) {
      if (d.abandoned) suppressNextClick()
      return
    }
    const dx = e.clientX - d.startX
    const now = e.timeStamp
    const recent = d.samples.filter((s) => now - s.t <= 100)
    let flick = 0
    if (recent.length >= 2) {
      const a = recent[0]
      const b = recent[recent.length - 1]
      flick = (b.x - a.x) / Math.max(1, b.t - a.t)
    }
    const absDx = Math.abs(dx)
    const shouldCommit = absDx >= COMMIT_DISTANCE || Math.abs(flick) >= FLICK_SPEED
    if (shouldCommit) {
      // 右スワイプ(dx>0)=前日・左スワイプ(dx<0)=翌日
      commitSwipe(dx > 0 ? 'prev' : 'next')
    } else {
      finishAsSnapback()
    }
  }

  const onPointerCancel = () => {
    finishAsSnapback()
  }

  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.suppressClick) {
      e.stopPropagation()
      e.preventDefault()
    }
  }

  return (
    <div ref={stageRef} className='swipe-stage'>
      <div ref={depthRef} className='swipe-depth-card' aria-hidden='true' style={{ opacity: 0, transform: 'scale(0.9)' }} />
      <div ref={stampPrevRef} className='swipe-stamp swipe-stamp-prev' aria-hidden='true' style={{ opacity: 0 }}>
        ‹前日
      </div>
      <div ref={stampNextRef} className='swipe-stamp swipe-stamp-next' aria-hidden='true' style={{ opacity: 0 }}>
        翌日›
      </div>
      <div
        ref={cardRef}
        className='swipe-front-card'
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </div>
  )
}
