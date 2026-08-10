import { useCallback, useEffect, useRef, useState } from 'react'
import type { TourBranch, TourStep } from '../utils/tour-steps'

// コーチマークの汎用進行エンジン。分岐の有無・自動再生の可否・再生トリガーは呼び出し側が渡す。
// ステップの中身(文言・セレクタ)は一切知らず、渡された対象をそのまま表示するだけ

export type UseCoachMarkTourParams = {
  // 分岐なしで直列実行するステップ列
  steps?: readonly TourStep[]
  // 分岐カードから始める場合。steps より優先する
  branch?: TourBranch
  // 既読フラグの localStorage キー
  storageKey: string
  // 増えるたびに既読を無視して再生する
  replayNonce: number
  // 初回未読時の自動表示可否。既定は true
  autoStart?: boolean
  // 対象を画面中央へ寄せる手段(持たない画面は省略可)
  centerOnSelector?: (selector: string) => void
}

export type CoachMarkTourState = {
  isOpen: boolean
  isBranching: boolean
  branch: TourBranch | undefined
  step: TourStep | null
  stepIndex: number
  stepCount: number
  targetRect: DOMRect | null
  chooseBranch: (optionIndex: number) => void
  next: () => void
  prev: () => void
  // 既読化して閉じる(スキップ・とじる・最終ステップ共通)。ユーザーが明示的に閉じた時に使う
  close: () => void
  // 既読化せずに閉じる。編集モード退出など画面都合で畳む場合に使う。
  // 一度も操作していないツアーを既読扱いにしないため、次に活性化条件を満たせば再び自動再生される
  collapse: () => void
}

// 既読判定。SSR では常に既読扱いにして自動表示を止める。localStorage 参照が例外を投げる
// 環境では未読扱いにして再生は続ける。値は旧表記 'true' も既読とみなす(null でなければ既読)
export const readSeen = (storageKey: string): boolean => {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(storageKey) !== null
  } catch {
    return false
  }
}

const markSeen = (storageKey: string): void => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey, '1')
  } catch {
    // 保存できなくても再生は続ける
  }
}

export const useCoachMarkTour = ({
  steps,
  branch,
  storageKey,
  replayNonce,
  autoStart,
  centerOnSelector,
}: UseCoachMarkTourParams): CoachMarkTourState => {
  const [isOpen, setIsOpen] = useState(false)
  // 分岐カードを未選択の間は null。分岐なしのツアーは開いた瞬間に steps がそのまま積まれる
  const [chosenSteps, setChosenSteps] = useState<readonly TourStep[] | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const prevReplayNonceRef = useRef(replayNonce)

  const step = isOpen && chosenSteps && stepIndex < chosenSteps.length ? chosenSteps[stepIndex] : null
  const isBranching = isOpen && branch !== undefined && chosenSteps === null

  // 開始(分岐カードへ戻すか、直列ステップの先頭から積み直す)。
  // マウント時自動再生・replayNonce 再生のどちらからも呼ぶ共通処理
  const openTour = useCallback(() => {
    setIsOpen(true)
    setChosenSteps(branch ? null : steps ?? [])
    setStepIndex(0)
    setTargetRect(null)
  }, [branch, steps])

  // 初回未読時だけマウント時に自動再生する。「編集モードに入った」等の活性化判断は
  // 呼び出し側の責務(replayNonce を上げる)なので、ここでは storageKey にしか反応しない
  useEffect(() => {
    if (autoStart === false) return
    if (readSeen(storageKey)) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    openTour()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  // replayNonce が前回より増えたら既読を無視して再生する。マウント直後の初期値と一致する間は発火しない
  useEffect(() => {
    if (replayNonce > prevReplayNonceRef.current) {
      openTour()
    }
    prevReplayNonceRef.current = replayNonce
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayNonce])

  // 対象の実測。見つからない・セレクタ未指定ならスポットライト無しの中央カードとして扱う(飛ばさない)
  useEffect(() => {
    if (!isOpen || !step || !step.selector) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTargetRect(null)
      return
    }
    const selector = step.selector
    const target = document.querySelector<HTMLElement>(selector)
    if (!target) {
      setTargetRect(null)
      return
    }
    if (step.centerOnShow && centerOnSelector) {
      centerOnSelector(selector)
      const timer = window.setTimeout(() => {
        const moved = document.querySelector<HTMLElement>(selector)
        setTargetRect(moved ? moved.getBoundingClientRect() : null)
      }, 360)
      return () => window.clearTimeout(timer)
    }
    setTargetRect(target.getBoundingClientRect())
  }, [isOpen, step, centerOnSelector])

  return {
    isOpen,
    isBranching,
    branch,
    step,
    stepIndex,
    stepCount: chosenSteps?.length ?? 0,
    targetRect,
    chooseBranch: useCallback(
      (optionIndex: number) => {
        const option = branch?.options[optionIndex]
        if (!option) return
        setChosenSteps(option.steps)
        setStepIndex(0)
      },
      [branch]
    ),
    next: useCallback(() => setStepIndex((current) => current + 1), []),
    prev: useCallback(() => setStepIndex((current) => Math.max(current - 1, 0)), []),
    close: useCallback(() => {
      markSeen(storageKey)
      setIsOpen(false)
      setChosenSteps(null)
      setStepIndex(0)
      setTargetRect(null)
    }, [storageKey]),
    collapse: useCallback(() => {
      setIsOpen(false)
      setChosenSteps(null)
      setStepIndex(0)
      setTargetRect(null)
    }, []),
  }
}
