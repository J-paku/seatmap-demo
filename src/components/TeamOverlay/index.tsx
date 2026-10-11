import { EditDock } from './components/EditDock'
import { OverlayBody } from './components/OverlayBody'
import { OverlayDialogs } from './components/OverlayDialogs'
import { OverlayPanel } from './components/OverlayPanel'
import { OverlayWrap } from './components/OverlayWrap'
import { useIsCompactMobile } from './hooks/use-compact-mobile'
import { useOverlayEditMode } from './hooks/use-overlay-edit-mode'
import { useOverlayEditWiring } from './hooks/use-overlay-edit-wiring'
import { useOverlaySession } from './hooks/use-overlay-session'
import { usePanelShell } from './hooks/use-panel-shell'
import { useSeatDrag } from './hooks/use-seat-drag'
import { useSeatLayoutCompose } from './hooks/use-seat-layout-compose'
import { useSeatLayoutTour } from './hooks/use-seat-layout-tour'
import { useSeatSelection } from './hooks/use-seat-selection'
import { useTeamSeats } from './hooks/use-team-seats'
import type { TeamOverlayProps } from './type'
import { useGlobalAnnouncement } from '@/contexts/announcement-context'
import { CoachMarkTour } from '@/components/CoachMarkTour'

// 10: チームバウンダリクリックで開く大型オーバーレイ(座席グリッド全体)
// クリックしたバウンダリ中心から膨らむように開く。中央固定拡大ではない
// 幅 760px を境に、シェル形状・座席グリッド・入力モデルがまるごと切り替わる

type Props = TeamOverlayProps

export const TeamOverlay = ({
  payload,
  seats,
  employeeById,
  presenceMap,
  onClose,
  onSeatClick,
  highlightSeatId = null,
  onClearHighlight,
  minimapAreas,
  minimapFurniture,
  minimapTeamArea = null,
  minimapViewBox,
}: Props) => {
  const isCompactMobile = useIsCompactMobile()
  const session = useOverlaySession(payload !== null)
  // STEP D3: 編集の開始・保存・キャンセル・一括配置の結果はここから唯一のLiveRegion(a11y全体で
  // 共有するAnnouncementProvider)へ流す。TeamOverlay専用のLiveRegionは新設しない
  const { announce } = useGlobalAnnouncement()

  const { teamSeats, occupiedCount, emptySeatCount } = useTeamSeats(seats, payload, employeeById)
  const editMode = useOverlayEditMode()
  const seatGrid = useSeatLayoutCompose({
    teamSeats,
    isEditMode: editMode.isEditMode,
    grid: editMode.grid,
    draft: editMode.draft,
  })

  // STEP B1: 編集中セルの選択(席か空セルのどちらか1件だけ)。編集モードを抜けると自動で消える
  const seatSelection = useSeatSelection(editMode.isEditMode)

  // 編集セッションの配線(選択のトグル・席追加とハイライト・配属シート・一括配置・保存/取消・
  // 編集中の閉じるガード)はuse-overlay-edit-wiringの1本にまとめてある
  const edit = useOverlayEditWiring({
    payload,
    seats,
    teamSeats,
    employeeById,
    seatGrid,
    editMode,
    seatSelection,
    isCompactMobile,
    bodyRef: session.bodyRef,
    minimapTeamArea,
    announce,
    onClose,
  })

  // STEP B2/B3: 編集中セルのドラッグ移動/入替とゴミ箱への削除。moveSeatはuseOverlayEditModeの
  // grid差分適用口をそのまま渡す。§07-2: ゴミ箱投下(このフック内部のタッチ経路+後段の
  // TrashDropZoneのマウス経路、両方がこの1つの引数を呼ぶ)は即時削除ではなく確認要求
  // (requestSeatDeleteAtCell)へ差し替え、§06-2セルの削除ボタンと同じ確認モーダルへ合流させる
  const seatDrag = useSeatDrag({
    moveSeat: editMode.moveSeat,
    removeSeatAtCell: edit.requestSeatDeleteAtCell,
  })

  const shell = usePanelShell(payload !== null, isCompactMobile, edit.guardedClose)
  const { tour, handleHelp } = useSeatLayoutTour()

  if (!payload) return null

  return (
    <OverlayWrap isCompactMobile={isCompactMobile} onClose={edit.guardedClose}>
      <OverlayPanel
        payload={payload}
        isCompactMobile={isCompactMobile}
        loading={session.loading}
        clickLocked={session.clickLocked}
        occupiedCount={occupiedCount}
        shell={shell}
        highlightSeatId={highlightSeatId}
        onClearHighlight={onClearHighlight}
        isEditMode={editMode.isEditMode}
        onClearSelection={seatSelection.clearSelection}
        onClose={edit.guardedClose}
      >
        <OverlayBody
          payload={payload}
          isCompactMobile={isCompactMobile}
          session={session}
          teamSeats={teamSeats}
          seatGrid={seatGrid}
          editMode={editMode}
          edit={edit}
          seatDrag={seatDrag}
          seatSelection={seatSelection}
          employeeById={employeeById}
          presenceMap={presenceMap}
          highlightSeatId={highlightSeatId}
          onSeatClick={onSeatClick}
          onClearHighlight={onClearHighlight}
          onHelp={handleHelp}
          minimapAreas={minimapAreas}
          minimapFurniture={minimapFurniture}
          minimapTeamArea={minimapTeamArea}
          minimapViewBox={minimapViewBox}
        />
        {/* STEP D3: 保存/キャンセルの編集ドック。styles.panel(position: relative)基準の
            絶対配置で下部に浮かせるだけなので、TrashDropZoneと違いSeatMapPortalへは逃がさない
            (viewport基準のfixed位置決めが要らないため) */}
        {editMode.isEditMode && (
          <EditDock
            changeCount={editMode.draft.changeCount}
            hasChanges={edit.hasEditChanges}
            isSaving={edit.seatCommit.isSaving}
            onSave={edit.handleSaveEdit}
            onCancel={edit.handleCancelEdit}
          />
        )}
      </OverlayPanel>
      {/* STEP C2/§07-2/§07-4/§07-5/§06-3/§07-3: 配属シート+確認ダイアログ5種はOverlayDialogsへ集約
          (01-authoring §4: indexは組み立てのみ)。SeatMapPortal経由でbody直下へ描く事情も
          そちらに引き継いだ */}
      <OverlayDialogs
        edit={edit}
        employeeById={employeeById}
        teamName={payload.teamName}
        occupiedCount={occupiedCount}
        emptySeatCount={emptySeatCount}
      />
      {/* 座席配置ガイド。.panel は指追従の transform を受けるため、fixed 基準のスポットライトが
          その中にあると座標系がずれる。.wrap(fixed・transform なし)直下に置いて基準を分ける */}
      <CoachMarkTour tour={tour} />
    </OverlayWrap>
  )
}
