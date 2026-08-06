import { useCallback, useEffect, useState } from 'react'
import { TOUR_STEPS, TOUR_STORAGE_KEY } from '../utils/tour-steps'
import type { TourFlow, TourStep } from '../utils/tour-steps'

// ツアーの進行。対象が見つからないステップは飛ばし、画面外なら中央へ寄せてから出す

type Options = {
  // 編集モードに入っているか。抜けたらツアーも畳む
  isActive: boolean
  // 対象を画面中央へ寄せる手段(キャンバス側が持つ)
  centerOnSelector: (selector: string) => void
}

type TourState = {
  // 分岐カードを出しているか
  isBranching: boolean
  step: TourStep | null
  stepIndex: number
  stepCount: number
  targetRect: DOMRect | null
  open: () => void
  chooseFlow: (flow: TourFlow) => void
  next: () => void
  close: () => void
}

const isSeen = (flow: TourFlow): boolean => {
  if (typeof window === 'undefined') return true
  return window.localStorage.getItem(TOUR_STORAGE_KEY[flow]) === 'true'
}

const markSeen = (flow: TourFlow): void => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(TOUR_STORAGE_KEY[flow], 'true')
  } catch {
    // 保存できなくても再生は続ける
  }
}

const findTarget = (selector: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(selector)

const isOffscreen = (rect: DOMRect): boolean =>
  rect.bottom < 0 || rect.right < 0 || rect.top > window.innerHeight || rect.left > window.innerWidth

export const useCoachMarkTour = ({ isActive, centerOnSelector }: Options): TourState => {
  const [isOpen, setIsOpen] = useState(false)
  const [flow, setFlow] = useState<TourFlow | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  const steps = flow ? TOUR_STEPS[flow] : []
  const step = flow && stepIndex < steps.length ? steps[stepIndex] : null

  const close = useCallback(() => {
    setIsOpen(false)
    setFlow(null)
    setStepIndex(0)
    setTargetRect(null)
  }, [])

  // 編集モードを抜けたら畳む。close() は状態4本をまとめて戻す後始末で、
  // 描画由来の派生値ではないので effect から呼ぶ以外の置き場が無い
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isActive && isOpen) close()
  }, [isActive, isOpen, close])

  // 編集モードへ初めて入ったときだけ自動再生する
  useEffect(() => {
    if (!isActive) return
    if (isSeen('layout') && isSeen('facility')) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOpen(true)
  }, [isActive])

  // 対象の実測。見つからなければ次のステップへ送る
  useEffect(() => {
    if (!isOpen || !step) return
    const target = findTarget(step.selector)
    if (!target) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStepIndex((prev) => prev + 1)
      return
    }
    const rect = target.getBoundingClientRect()
    if (isOffscreen(rect)) {
      centerOnSelector(step.selector)
      const timer = window.setTimeout(() => {
        const moved = findTarget(step.selector)
        setTargetRect(moved ? moved.getBoundingClientRect() : null)
      }, 360)
      return () => window.clearTimeout(timer)
    }
    setTargetRect(rect)
  }, [isOpen, step, stepIndex, centerOnSelector])

  // 最後まで進んだら閉じる。ステップ数の到達判定は描画後にしか出来ないので effect に置く
  useEffect(() => {
    if (!isOpen || !flow) return
    if (stepIndex < steps.length) return
    markSeen(flow)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    close()
  }, [isOpen, flow, stepIndex, steps.length, close])

  return {
    isBranching: isOpen && flow === null,
    step,
    stepIndex,
    stepCount: steps.length,
    targetRect,
    open: useCallback(() => {
      setFlow(null)
      setStepIndex(0)
      setIsOpen(true)
    }, []),
    chooseFlow: useCallback((next: TourFlow) => {
      setFlow(next)
      setStepIndex(0)
    }, []),
    next: useCallback(() => setStepIndex((prev) => prev + 1), []),
    close: useCallback(() => {
      if (flow) markSeen(flow)
      close()
    }, [flow, close]),
  }
}
