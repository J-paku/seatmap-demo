import { useCallback, useState } from 'react'
import { SEAT_LAYOUT_TOUR_STEPS, SEAT_LAYOUT_TOUR_STORAGE_KEY } from '../utils/tour-steps'
import { useCoachMarkTour } from '@/components/CoachMarkTour/hooks/use-coach-mark-tour'
import type { CoachMarkTourState } from '@/components/CoachMarkTour/type'

// 座席配置ガイド。分岐なし2ステップで自動再生はせず、ヘッダーのガイドボタンから
// 再生する度に既読を無視して最初から出す(既読フラグの無効化=replayNonceの加算)

type UseSeatLayoutTourResult = {
  // CoachMarkTour へそのまま渡す進行状態
  tour: CoachMarkTourState
  // ヘッダーのガイドボタンから呼ぶ再生口
  handleHelp: () => void
}

export const useSeatLayoutTour = (): UseSeatLayoutTourResult => {
  const [tourReplayNonce, setTourReplayNonce] = useState(0)
  const tour = useCoachMarkTour({
    steps: SEAT_LAYOUT_TOUR_STEPS,
    storageKey: SEAT_LAYOUT_TOUR_STORAGE_KEY,
    replayNonce: tourReplayNonce,
    autoStart: false,
  })
  const handleHelp = useCallback(() => setTourReplayNonce(count => count + 1), [])

  return { tour, handleHelp }
}
