import type { ReactNode, RefObject } from 'react'

export type SwipeDateStageProps = {
  // 変化を検知するための識別子(選択日のキー)。DOMノードは再マウントせず direct style で演出する
  cardKey: string
  onSwipePrevDay: () => void
  onSwipeNextDay: () => void
  // 親シートの縦領域いっぱいに段とカードを伸ばす(旧: 各シート側の子孫セレクタ上書き)
  fill?: boolean
  children: ReactNode
}

export type SwipePhase = 'idle' | 'exit' | 'enter'

// スワイプ方向(右=前日 / 左=翌日)
export type SwipeDirection = 'prev' | 'next'

// 直接style操作の対象になる要素群
export type SwipeStageRefs = {
  stageRef: RefObject<HTMLDivElement | null>
  cardRef: RefObject<HTMLDivElement | null>
  depthRef: RefObject<HTMLDivElement | null>
  stampPrevRef: RefObject<HTMLDivElement | null>
  stampNextRef: RefObject<HTMLDivElement | null>
}
