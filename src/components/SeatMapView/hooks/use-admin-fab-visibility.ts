import { isTourPlaying } from '@/components/CoachMarkTour/hooks/use-coach-mark-tour'
import type { CoachMarkTourState } from '@/components/CoachMarkTour/hooks/use-coach-mark-tour'
import { useDetailPanel } from '@/contexts/detail-panel-context'
import type { TeamOverlayPayload } from '@/types'

// 左下 FAB を出してよいかの判定を1本に集める。条件は今後も増えるので、
// 呼び出し側に `||` を並べず、増えた分はこのフックの中だけで閉じる。
//
// 編集セッション中も FAB は閉じた状態で表示し続ける(本家仕様 F-06)。
// 隠すのはシート・オーバーレイ等が画面を占有している間だけ

// ツアーは再生中だけ画面全面を覆う。分岐カードか、対象を指すステップが立っている状態。
// 画面には複数のツアーインスタンス(メイン・編集)が同時に存在しうるので、
// 「いずれか1つでも再生中か」の判定はこのフックの中だけで持つ(呼び出し側で || をつなげない)
type TourState = Pick<CoachMarkTourState, 'isBranching' | 'step'>

type Params = {
  // チーム箱タップで開くオーバーレイ
  teamOverlayPayload: TeamOverlayPayload | null
  isDirectoryOpen: boolean
  // 追加フローが idle でない(カテゴリ・ピッカー・チーム作成・ゴースト)
  isPlacementActive: boolean
  // 座席への配属シートが見ている座席
  assignSeatId: string | null
  // 同時に存在しうる全ツアーインスタンス。1つでも再生中なら FAB を隠す
  tours: readonly TourState[]
  // 編集セッション中に選ばれている座席数。1席以上でFABを隠す —
  // 一括操作バーが下部中央へ落ちるとFABと重なり、覆われた部分が押せなくなる
  selectedSeatCount: number
  // レイアウト切り替えアイランドを展開している間
  isLayoutSwitcherOpen: boolean
}

export const useAdminFabVisibility = ({
  teamOverlayPayload,
  isDirectoryOpen,
  isPlacementActive,
  assignSeatId,
  tours,
  selectedSeatCount,
  isLayoutSwitcherOpen,
}: Params): boolean => {
  const { seatDetailId, personDetailId, facilityDetailId, scheduleDetailId } = useDetailPanel()

  const isDetailOpen =
    seatDetailId !== null || personDetailId !== null || facilityDetailId !== null || scheduleDetailId !== null
  const hasPlayingTour = tours.some(isTourPlaying)

  return !(
    isDetailOpen ||
    teamOverlayPayload !== null ||
    isDirectoryOpen ||
    isPlacementActive ||
    assignSeatId !== null ||
    hasPlayingTour ||
    selectedSeatCount >= 1 ||
    isLayoutSwitcherOpen
  )
}
