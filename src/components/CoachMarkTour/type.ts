import type { TourBranch, TourStep } from './utils/tour-steps'

// コーチマークの進行エンジン(use-coach-mark-tour)が返す状態と操作。
// 描画(index.tsx)と再生中の判定(utils/is-tour-playing)も読むので、フックのファイルの外に置く
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
