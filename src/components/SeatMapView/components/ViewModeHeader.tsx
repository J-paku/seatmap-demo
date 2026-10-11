import { AppHeader } from './AppHeader'
import type { SeatMapTours } from '../hooks/use-seat-map-tours'
import type { SurfaceState } from '../hooks/use-surface-state'
import { GuideButton } from '@/components/GuideButton'
import { LayoutSwitcher } from '@/components/LayoutSwitcher'
import styles from '@/components/seatmap.module.css'

// 閲覧モードの上部導線(ヘッダー・レイアウト切り替えアイランド・使い方ガイドの入口)。
// 編集中は呼び出し側が丸ごと出さない

type Props = {
  surface: SurfaceState
  tours: SeatMapTours
}

export const ViewModeHeader = ({
  surface: { isDirectoryOpen, setIsDirectoryOpen, setIsLayoutSwitcherOpen },
  tours,
}: Props) => (
  <>
    <AppHeader onOpenDirectory={() => setIsDirectoryOpen(true)} isDirectoryOpen={isDirectoryOpen} />
    {/* 編集中は土台(公式/カスタム)を差し替えさせない。差し替えるとワーキングコピーが宙に浮く */}
    <LayoutSwitcher onExpandedChange={setIsLayoutSwitcherOpen} />
    {/* 使い方ガイドの入口。アイランドと同じ行に並べたいので、ヘッダーではなくここで描く */}
    <GuideButton
      ariaLabel='使い方ガイド'
      onClick={tours.replayMainTour}
      className={styles.mapGuideButton}
    />
  </>
)
