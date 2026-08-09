import { useMemo, useRef } from 'react'
import { EditDock } from './components/EditDock'
import { Minimap } from './components/Minimap'
import { SeatDragGhost } from './components/SeatDragGhost'
import { SeatGridFrame } from './components/SeatGridFrame'
import { SeatLayoutHeader } from './components/SeatLayoutHeader'
import { TeamOverlayHeader } from './components/TeamOverlayHeader'
import { TrashDropZone } from './components/TrashDropZone'
import { useIsCompactMobile } from './hooks/use-compact-mobile'
import { useModalShell } from './hooks/use-modal-shell'
import { useOverlayEditMode } from './hooks/use-overlay-edit-mode'
import { useOverlayEditWiring } from './hooks/use-overlay-edit-wiring'
import { useOverlaySession } from './hooks/use-overlay-session'
import { useSeatDrag } from './hooks/use-seat-drag'
import { useSeatLayoutCompose } from './hooks/use-seat-layout-compose'
import { useSeatSelection } from './hooks/use-seat-selection'
import { anchorTransformOrigin } from './utils/anchor-origin'
import { SEAT_GRID_CELL_ATTR } from './utils/seat-drag-attrs'
import { COMPACT_SIDE_PADDING_PX } from './utils/seat-grid'
import type { TeamOverlayProps } from './type'
import { useGlobalAnnouncement } from '@/components/a11y'
import { ConfirmDialog } from '@/components/edit/ConfirmDialog'
import { EmployeeAssignSheet } from '@/components/EmployeeAssignSheet'
import { SeatMapPortal } from '@/components/SeatMapPortal'
import { SheetHandle } from '@/components/SheetHandle'
import { useSwipeDismiss } from '@/hooks/use-swipe-dismiss'
import type { Rect } from '@/utils/rect'

// 10: チームバウンダリクリックで開く大型オーバーレイ(座席グリッド全体)
// クリックしたバウンダリ中心から膨らむように開く。中央固定拡大ではない
// 幅 760px を境に、シェル形状・座席グリッド・入力モデルがまるごと切り替わる

export type { TeamOverlayPayload } from './type'
export type { MinimapArea, MinimapFurniture, MinimapKind } from './type'

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
  const bodyRef = useRef<HTMLDivElement>(null)
  const isCompactMobile = useIsCompactMobile()
  const { loading, clickLocked, syncedAt } = useOverlaySession(payload !== null, bodyRef)
  // STEP D3: 編集の開始・保存・キャンセル・一括配置の結果はここから唯一のLiveRegion(a11y全体で
  // 共有するAnnouncementProvider)へ流す。TeamOverlay専用のLiveRegionは新設しない
  const { announce } = useGlobalAnnouncement()

  const teamSeats = useMemo(
    () => (payload ? seats.filter((s) => s.teamId === payload.teamId) : []),
    [seats, payload]
  )
  const editMode = useOverlayEditMode()
  const seatGrid = useSeatLayoutCompose({
    teamSeats,
    isEditMode: editMode.isEditMode,
    grid: editMode.grid,
    draft: editMode.draft,
  })
  const occupiedCount = useMemo(() => teamSeats.filter((s) => s.employeeId).length, [teamSeats])

  // STEP B1: 編集中セルの選択(席か空セルのどちらか1件だけ)。編集モードを抜けると自動で消える
  const seatSelection = useSeatSelection(editMode.isEditMode)

  // STEP B2/B3: 編集中セルのドラッグ移動/入替とゴミ箱への削除。moveSeat/removeSeatAtCellは
  // どちらもuseOverlayEditModeが持つ唯一のgrid差分適用口をそのまま渡す
  const seatDrag = useSeatDrag({ moveSeat: editMode.moveSeat, removeSeatAtCell: editMode.removeSeatAtCell })

  // 編集セッションの配線(選択のトグル・席追加とハイライト・配属シート・一括配置・保存/取消・
  // 編集中の閉じるガード)はuse-overlay-edit-wiringの1本にまとめてある
  const {
    handleSelectSeat,
    handleSelectEmptyCell,
    handleAddSeat,
    assignSeatId,
    assignTargetSeat,
    assignEmployees,
    draftAppliedSeats,
    handleAssignSeat,
    handleAssignSelect,
    handleAssignClear,
    handleAssignClose,
    bulkAssign,
    handleBulkAssignRequest,
    seatCommit,
    handleSaveEdit,
    handleCancelEdit,
    guardedClose,
  } = useOverlayEditWiring({
    payload,
    seats,
    employeeById,
    seatGrid,
    editMode,
    seatSelection,
    isCompactMobile,
    bodyRef,
    announce,
    onClose,
  })

  // 下スワイプで閉じるのは Compact だけの挙動
  const { sheetRef, bind } = useSwipeDismiss({
    onClose: guardedClose,
    enabled: payload !== null && isCompactMobile,
    scrollGateRef: bodyRef,
  })
  useModalShell(payload !== null, sheetRef, guardedClose)

  if (!payload) return null

  const { teamColor, teamName, rect } = payload
  const sidePadding = isCompactMobile ? COMPACT_SIDE_PADDING_PX : 0
  const teamRect: Rect = minimapTeamArea ?? { x: 0, y: 0, w: 0, h: 0 }
  // STEP D3: 編集ドックの保存可否。changeCountだけ見ると、行・列の増減や席の移動(gridにしか
  // 現れずchangeCountでは1件も数えない)をした時に保存できない不具合が起きるため、
  // seatCommit.commitの内部ゲートと同じ2値(draft.changeCount / editMode.isGridChanged)を見る
  const hasEditChanges = editMode.draft.changeCount > 0 || editMode.isGridChanged

  return (
    <div
      className={`team-ovl-wrap${isCompactMobile ? ' is-compact' : ''}`}
      onClick={(e) => {
        // ラッパー余白クリックで閉じる(パネル自身のクリックは stopPropagation)
        if (e.target === e.currentTarget) guardedClose()
      }}
    >
      <div className='team-ovl-backdrop' onClick={guardedClose} />
      <div
        ref={sheetRef}
        className={`team-ovl-panel${isCompactMobile ? ' is-compact' : ''}`}
        role='dialog'
        aria-modal='true'
        aria-label={`${teamName} 座席配置`}
        style={{
          transformOrigin: anchorTransformOrigin(rect),
          pointerEvents: clickLocked ? 'none' : 'auto',
        }}
        onClick={(e) => {
          e.stopPropagation()
          // ヒット表示はその席自身のクリック以外で解除する。座席以外(空白・ヘッダー・
          // ミニマップ等)をクリックした時に消えなかったのが元の不具合。ヒット席自身の
          // クリックだけは社員詳細を開く経路と競合するため除外する
          if (highlightSeatId) {
            const seatEl = (e.target as HTMLElement).closest<HTMLElement>('[data-seat-id]')
            if (seatEl?.dataset.seatId !== highlightSeatId) onClearHighlight?.()
          }
          // 編集中はセル(席・空セルどちらも data-seat-grid-cell を持つ)以外のタップで選択解除する。
          // グリッド余白・オーバーレイ余白のどちらもこの1箇所で拾える
          if (editMode.isEditMode && !(e.target as HTMLElement).closest(`[${SEAT_GRID_CELL_ATTR}]`)) {
            seatSelection.clearSelection()
          }
        }}
        {...bind}
      >
        {loading && <div className='team-ovl-loadbar' style={{ background: teamColor }} />}
        {/* ハンドルは Compact のみ描画する */}
        {isCompactMobile && (
          <SheetHandle
            stripClassName='team-ovl-handle'
            barClassName='team-ovl-handle-bar'
            heightPx={48}
            onClose={guardedClose}
          />
        )}
        <TeamOverlayHeader
          teamName={teamName}
          teamColor={teamColor}
          occupiedCount={occupiedCount}
          isCompactMobile={isCompactMobile}
          onClose={guardedClose}
        />

        {/* 本文 — 座席配置セクション */}
        <div ref={bodyRef} className='team-ovl-body'>
          <section className='team-ovl-section'>
            <SeatLayoutHeader
              seatCount={teamSeats.length}
              loading={loading}
              syncedAt={syncedAt}
              sidePadding={sidePadding}
              isEditMode={editMode.isEditMode}
              isSaving={seatCommit.isSaving}
              onEnterEdit={() => {
                editMode.enterEditMode(teamSeats, teamRect)
                announce('[info]座席編集を開始しました')
              }}
              onExitEdit={handleCancelEdit}
            />
            {/* ドラッグ中だけ現れるゴミ箱。落とすとドラッグ元の席を削除する */}
            <TrashDropZone
              isVisible={seatDrag.draggingCell !== null}
              isOver={seatDrag.isOverTrash}
              onDrop={() => {
                if (seatDrag.draggingCell) editMode.removeSeatAtCell(seatDrag.draggingCell)
              }}
            />
            <SeatGridFrame
              isCompactMobile={isCompactMobile}
              grid={seatGrid}
              employeeById={employeeById}
              presenceMap={presenceMap}
              teamName={teamName}
              teamColor={teamColor}
              loading={loading}
              highlightSeatId={highlightSeatId}
              onSeatClick={onSeatClick}
              onClearHighlight={onClearHighlight}
              isEditMode={editMode.isEditMode}
              isSeatSelected={seatSelection.isSeatSelected}
              isEmptyCellSelected={seatSelection.isEmptyCellSelected}
              onSelectSeat={handleSelectSeat}
              onSelectEmptyCell={handleSelectEmptyCell}
              seatMouseDragProps={seatDrag.seatMouseDragProps}
              cellMouseDropProps={seatDrag.cellMouseDropProps}
              seatTouchProps={seatDrag.seatTouchProps}
              editGrid={editMode.grid}
              onAddRow={editMode.addRow}
              onAddCol={editMode.addCol}
              onRemoveRow={editMode.removeRow}
              onRemoveCol={editMode.removeCol}
              onAddSeat={handleAddSeat}
              onAssignSeat={handleAssignSeat}
              onRotateSeat={editMode.draft.rotateSeat}
            />
          </section>
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
        </div>
        {/* STEP D3: 保存/キャンセルの編集ドック。.team-ovl-panel(position: relative)基準の
            絶対配置で下部に浮かせるだけなので、TrashDropZoneと違いSeatMapPortalへは逃がさない
            (viewport基準のfixed位置決めが要らないため) */}
        {editMode.isEditMode && (
          <EditDock
            changeCount={editMode.draft.changeCount}
            hasChanges={hasEditChanges}
            isSaving={seatCommit.isSaving}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
          />
        )}
      </div>
      {/* STEP C2: .team-ovl-panel は backdrop-filter + overflow:hidden で fixed 子を閉じ込めるため、
          TrashDropZone と同じ理由で SeatMapPortal 経由で body 直下へ描く */}
      <SeatMapPortal>
        <EmployeeAssignSheet
          isOpen={assignSeatId !== null}
          seat={assignTargetSeat}
          employees={assignEmployees}
          seats={draftAppliedSeats}
          employeeById={employeeById}
          onSelect={handleAssignSelect}
          onClear={handleAssignClear}
          onClose={handleAssignClose}
          onBulkAssign={handleBulkAssignRequest}
        />
        {/* STEP C3: 他所配属者(movers)がいる時だけ出す移動確認。newcomers だけなら確認を挟まない */}
        {bulkAssign.pendingPlan?.confirmMessage && (
          <ConfirmDialog
            ariaLabel='部署一括配置の確認'
            message={bulkAssign.pendingPlan.confirmMessage}
            confirmLabel='実行する'
            onConfirm={bulkAssign.confirmBulkAssign}
            onCancel={bulkAssign.cancelBulkAssign}
          />
        )}
      </SeatMapPortal>
    </div>
  )
}
