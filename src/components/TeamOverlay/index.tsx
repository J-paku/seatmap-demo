import { EditDock } from './components/EditDock'
import { Minimap } from './components/Minimap'
import { OverlayDialogs } from './components/OverlayDialogs'
import { ScheduleSyncBadge } from './components/ScheduleSyncBadge'
import { SeatDragGhost } from './components/SeatDragGhost'
import { SeatGridFrame } from './components/SeatGridFrame'
import { SeatLayoutHeader } from './components/SeatLayoutHeader'
import { TeamOverlayHeader } from './components/TeamOverlayHeader'
import { TrashDropZone } from './components/TrashDropZone'
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
import { anchorTransformOrigin } from './utils/anchor-origin'
import {
  isMarginClick,
  shouldClearHighlight,
  shouldClearSelection,
} from './utils/judge-overlay-click'
import { resolveSidePadding } from './utils/resolve-side-padding'
import type { TeamOverlayProps } from './type'
import styles from './team-overlay-modal.module.css'
import { useGlobalAnnouncement } from '@/contexts/announcement-context'
import { SeatDeleteProvider } from '@/contexts/seat-delete-context'
import { CoachMarkTour } from '@/components/CoachMarkTour'
import { SheetHandle } from '@/components/SheetHandle'

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
  const { bodyRef, loading, clickLocked, syncedAtMs, syncCooldown, isSyncing, retrySync } =
    useOverlaySession(payload !== null)
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
    bodyRef,
    minimapTeamArea,
    announce,
    onClose,
  })
  const {
    handleEnterEdit,
    handleSelectSeat,
    handleAddSeat,
    handleAssignSeat,
    handleOpenBulkAssign,
    canOpenBulkAssign,
    freeAddressEnabled,
    toggleFreeAddress,
    requestSeatDelete,
    requestSeatDeleteAtCell,
    seatCommit,
    handleSaveEdit,
    handleCancelEdit,
    hasEditChanges,
    requestTeamDelete,
    guardedClose,
  } = edit

  // STEP B2/B3: 編集中セルのドラッグ移動/入替とゴミ箱への削除。moveSeatはuseOverlayEditModeの
  // grid差分適用口をそのまま渡す。§07-2: ゴミ箱投下(このフック内部のタッチ経路+後段の
  // TrashDropZoneのマウス経路、両方がこの1つの引数を呼ぶ)は即時削除ではなく確認要求
  // (requestSeatDeleteAtCell)へ差し替え、§06-2セルの削除ボタンと同じ確認モーダルへ合流させる
  const seatDrag = useSeatDrag({
    moveSeat: editMode.moveSeat,
    removeSeatAtCell: requestSeatDeleteAtCell,
  })

  // 下スワイプで閉じる(Compact だけ)・Escape・フォーカストラップをパネルの実ノードへ取り付ける
  const { sheetHandlers, dragStyle, setSheetNode } = usePanelShell(
    payload !== null,
    isCompactMobile,
    guardedClose
  )

  // 座席配置ガイド。再生はヘッダーのガイドボタン(handleHelp)からだけ
  const { tour, handleHelp } = useSeatLayoutTour()

  if (!payload) return null

  const { teamColor, teamName, rect } = payload
  const sidePadding = resolveSidePadding(isCompactMobile)
  return (
    <div
      className={`${styles.wrap}${isCompactMobile ? ` ${styles.isCompact}` : ''}`}
      onClick={e => {
        // ラッパー余白クリックで閉じる(パネル自身のクリックは stopPropagation)
        if (isMarginClick(e.target, e.currentTarget)) guardedClose()
      }}
    >
      <div className={styles.backdrop} onClick={guardedClose} />
      <div
        className={`${styles.panel}${isCompactMobile ? ` ${styles.isCompact}` : ''}`}
        role='dialog'
        aria-modal='true'
        aria-label={`${teamName} 座席配置`}
        style={{
          transformOrigin: anchorTransformOrigin(rect),
          pointerEvents: clickLocked ? 'none' : 'auto',
          // ドラッグ中は指へ追従(transform はフックが直接書き込む)、離指後はここの
          // transition が復帰してスナップバックする
          transform: dragStyle.transform,
          transition: dragStyle.transition,
          willChange: dragStyle.willChange,
        }}
        onClick={e => {
          e.stopPropagation()
          if (shouldClearHighlight(e.target as HTMLElement, highlightSeatId)) onClearHighlight?.()
          if (shouldClearSelection(e.target as HTMLElement, editMode.isEditMode)) {
            seatSelection.clearSelection()
          }
        }}
        {...sheetHandlers}
        ref={setSheetNode}
      >
        {loading && <div className={styles.loadbar} style={{ background: teamColor }} />}
        {/* ハンドルは Compact のみ描画する */}
        {isCompactMobile && (
          <SheetHandle
            stripClassName={styles.handle}
            barClassName={styles.handleBar}
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
        <div ref={bodyRef} className={styles.body}>
          <section className={styles.section}>
            <SeatLayoutHeader
              seatCount={teamSeats.length}
              sidePadding={sidePadding}
              isCompactMobile={isCompactMobile}
              isEditMode={editMode.isEditMode}
              isSaving={seatCommit.isSaving}
              onEnterEdit={handleEnterEdit}
              onExitEdit={handleCancelEdit}
              onHelp={handleHelp}
              canBulkAssign={canOpenBulkAssign}
              onBulkAssign={handleOpenBulkAssign}
              freeAddressEnabled={freeAddressEnabled}
              onToggleFreeAddress={toggleFreeAddress}
            />
            {/* 見出しの直下1行で、今どの時点のスケジュールを見ているかと再取得の入口を出す */}
            <ScheduleSyncBadge
              isLoading={loading || isSyncing}
              lastUpdatedMs={syncedAtMs}
              cooldown={syncCooldown}
              onRetry={retrySync}
              sidePadding={sidePadding}
            />
            {/* ドラッグ中だけ現れるゴミ箱。落とすと§07-2確認モーダルを開く(即時削除はしない) */}
            <TrashDropZone
              isVisible={seatDrag.draggingCell !== null}
              isOver={seatDrag.isOverTrash}
              onDrop={() => {
                if (seatDrag.draggingCell) requestSeatDeleteAtCell(seatDrag.draggingCell)
              }}
            />
            {/* §06-2: セルの削除ボタン(aria-label='座席を削除')の要求口をContext経由で配る。
                DesktopSeatGrid/CompactSeatGrid(担当外)を経由してEditSeatCellが描かれるため、
                そちら側にprops追加をせずに済ませる(EditSeatCell.tsx参照) */}
            <SeatDeleteProvider value={requestSeatDelete}>
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
                onSelectSeat={handleSelectSeat}
                seatMouseDragProps={seatDrag.seatMouseDragProps}
                cellMouseDropProps={seatDrag.cellMouseDropProps}
                seatTouchProps={seatDrag.seatTouchProps}
                hoverCell={seatDrag.hoverCell}
                editGrid={editMode.grid}
                onAddRow={editMode.addRow}
                onAddCol={editMode.addCol}
                onRemoveRow={editMode.removeRow}
                onRemoveCol={editMode.removeCol}
                onAddSeat={handleAddSeat}
                onAssignSeat={handleAssignSeat}
                onRotateSeat={editMode.draft.rotateSeat}
              />
            </SeatDeleteProvider>
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
          {/* §06-6: チーム削除はオーバーレイのフッター。編集モード(=管理者が鉛筆から入った状態)
              でだけ出し、押すとタイプ確認モーダルへ進む */}
          {editMode.isEditMode && (
            <div className={styles.teamDeleteFooter}>
              <button
                type='button'
                className={`pixel-btn ${styles.teamDeleteButton}`}
                onClick={requestTeamDelete}
                disabled={seatCommit.isSaving}
              >
                <span className='material-symbols-outlined' aria-hidden='true'>
                  delete_forever
                </span>
                {`${teamName}を削除`}
              </button>
            </div>
          )}
        </div>
        {/* STEP D3: 保存/キャンセルの編集ドック。styles.panel(position: relative)基準の
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
      {/* STEP C2/§07-2/§07-4/§07-5/§06-3/§07-3: 配属シート+確認ダイアログ5種はOverlayDialogsへ集約
          (01-authoring §4: indexは組み立てのみ)。SeatMapPortal経由でbody直下へ描く事情も
          そちらに引き継いだ */}
      <OverlayDialogs
        edit={edit}
        employeeById={employeeById}
        teamName={teamName}
        occupiedCount={occupiedCount}
        emptySeatCount={emptySeatCount}
      />
      {/* 座席配置ガイド。.panel は指追従の transform を受けるため、fixed 基準のスポットライトが
          その中にあると座標系がずれる。.wrap(fixed・transform なし)直下に置いて基準を分ける */}
      <CoachMarkTour tour={tour} />
    </div>
  )
}
