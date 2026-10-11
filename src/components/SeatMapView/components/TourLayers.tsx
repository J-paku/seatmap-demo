import type { SeatMapTours } from '../hooks/use-seat-map-tours'
import type { LayoutEditor } from '../type'
import { CoachMarkTour } from '@/components/CoachMarkTour'

// 操作ガイド4本(編集・メイン・チーム・家具)の層。どれをいつ再生するかは useSeatMapTours が決める

type Props = {
  editor: LayoutEditor
  tours: SeatMapTours
}

export const TourLayers = ({ editor, tours }: Props) => (
  <>
    {/* 暗幕が2枚重なると操作不能になる。フロー導線のガイドが再生中は編集/メインの層を描かない */}
    {editor.isEditMode && !tours.isFlowTourPlaying && <CoachMarkTour tour={tours.editTour} />}
    {!editor.isEditMode && !tours.isFlowTourPlaying && <CoachMarkTour tour={tours.mainTour} />}
    {/* §05-7: この2つは常時マウントする。FAB はセッションの外で押され、
        選択と同じフレームで ensureEditSession が isEditMode を立てるので、
        isEditMode ガードを掛けると初回の自動再生とタイミングがずれる */}
    <CoachMarkTour tour={tours.teamTour} />
    <CoachMarkTour tour={tours.furnitureTour} />
  </>
)
