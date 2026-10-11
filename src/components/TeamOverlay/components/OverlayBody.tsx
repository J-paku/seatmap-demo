import { Minimap } from './Minimap'
import { SeatDragGhost } from './SeatDragGhost'
import { SeatLayoutSection } from './SeatLayoutSection'
import type { SeatLayoutSectionProps } from './SeatLayoutSection'
import { TeamDeleteFooter } from './TeamDeleteFooter'
import type { TeamOverlayProps } from '../type'
import styles from '../team-overlay-modal.module.css'
import type { MinimapArea } from '@/types'

// 本文(パネルの中でスクロールする領域)。座席配置セクション → ドラッグ中のゴースト → ミニマップ →
// チーム削除フッターの順に積む。座席配置セクションへ渡す束は中身を見ずにそのまま通す

// ミニマップ用の3つは TeamOverlay の props をそのまま受ける。
// areas と furniture が渡されなければミニマップ自体を描かない
type Props = SeatLayoutSectionProps &
  Pick<TeamOverlayProps, 'minimapAreas' | 'minimapFurniture' | 'minimapViewBox'> & {
    // 既定値(null)は index.tsx が埋めてから渡す
    minimapTeamArea: MinimapArea | null
  }

export const OverlayBody = ({
  minimapAreas,
  minimapFurniture,
  minimapTeamArea,
  minimapViewBox,
  ...sectionProps
}: Props) => {
  const { payload, session, editMode, edit, seatDrag } = sectionProps
  const { teamName } = payload
  const { bodyRef } = session
  const { requestTeamDelete, seatCommit } = edit
  return (
    <div ref={bodyRef} className={styles.body}>
      <SeatLayoutSection {...sectionProps} />
      {/* タッチドラッグ中だけ指へ追従するゴースト。マウスはネイティブDnDの既定画像に任せる */}
      {seatDrag.touchGhostPosition && (
        <SeatDragGhost x={seatDrag.touchGhostPosition.x} y={seatDrag.touchGhostPosition.y} />
      )}
      {/* ミニマップは座席グリッドの下。渡されなければ描かない */}
      {minimapAreas && minimapFurniture && (
        <Minimap
          areas={minimapAreas}
          furniture={minimapFurniture}
          currentArea={minimapTeamArea}
          viewBox={minimapViewBox}
          teamName={teamName}
        />
      )}
      {/* §06-6: チーム削除はオーバーレイのフッター。編集モード(=管理者が鉛筆から入った状態)
          でだけ出し、押すとタイプ確認モーダルへ進む */}
      {editMode.isEditMode && (
        <TeamDeleteFooter
          teamName={teamName}
          isSaving={seatCommit.isSaving}
          onRequestDelete={requestTeamDelete}
        />
      )}
    </div>
  )
}
