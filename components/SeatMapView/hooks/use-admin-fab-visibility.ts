import type { useCoachMarkTour } from '@/components/CoachMarkTour/hooks/use-coach-mark-tour'
import type { TeamOverlayPayload } from '@/components/TeamOverlay'
import { useDetailPanel } from '@/contexts/detail-panel-context'

// 左下 FAB を出してよいかの判定を1本に集める。条件は今後も増えるので、
// 呼び出し側に `||` を並べず、増えた分はこのフックの中だけで閉じる。
//
// 編集モードそのものは隠す条件に入れない。実物と同じく、編集中も閉じた `+` は出したままにする

// ツアーは再生中だけ画面全面を覆う。分岐カードか、対象を指すステップが立っている状態
type TourState = Pick<ReturnType<typeof useCoachMarkTour>, 'isBranching' | 'step'>

type Params = {
  // チーム箱タップで開くオーバーレイ
  teamOverlayPayload: TeamOverlayPayload | null
  isDirectoryOpen: boolean
  // 追加フローが idle でない(カテゴリ・ピッカー・チーム作成・ゴースト)
  isPlacementActive: boolean
  // 座席への配属シートが見ている座席
  assignSeatId: string | null
  tour: TourState
  // レイアウト切り替えアイランドを展開している間
  isLayoutSwitcherOpen: boolean
}

export const useAdminFabVisibility = ({
  teamOverlayPayload,
  isDirectoryOpen,
  isPlacementActive,
  assignSeatId,
  tour,
  isLayoutSwitcherOpen,
}: Params): boolean => {
  const { seatDetailId, personDetailId, facilityDetailId, scheduleDetailId } = useDetailPanel()

  const isDetailOpen =
    seatDetailId !== null || personDetailId !== null || facilityDetailId !== null || scheduleDetailId !== null
  const isTourPlaying = tour.isBranching || tour.step !== null

  return !(
    isDetailOpen ||
    teamOverlayPayload !== null ||
    isDirectoryOpen ||
    isPlacementActive ||
    assignSeatId !== null ||
    isTourPlaying ||
    isLayoutSwitcherOpen
  )
}
