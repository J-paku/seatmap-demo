import { useCallback, useMemo, useRef, useState } from 'react'
import { EditDock } from './components/EditDock'
import { Minimap } from './components/Minimap'
import { OverlayDialogs } from './components/OverlayDialogs'
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
import { SEAT_LAYOUT_TOUR_STEPS, SEAT_LAYOUT_TOUR_STORAGE_KEY } from './utils/tour-steps'
import type { TeamOverlayProps } from './type'
import styles from './team-overlay-modal.module.css'
import { useGlobalAnnouncement } from '@/contexts/announcement-context'
import { SeatDeleteProvider } from '@/contexts/seat-delete-context'
import { CoachMarkTour } from '@/components/CoachMarkTour'
import { useCoachMarkTour } from '@/components/CoachMarkTour/hooks/use-coach-mark-tour'
import { SheetHandle } from '@/components/SheetHandle'
import { useSwipeToDismiss } from '@/hooks/use-swipe-to-dismiss'
import type { Rect } from '@/utils/layout/rect'
import { countOccupiedSeats } from '@/utils/seat-occupancy'

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
  // 判定基準は utils/seat-occupancy.ts に一本化(存在しない社員IDを参照する座席まで
  // 数えてしまい、空席なのに N名と出る不整合を防ぐ)
  const occupiedCount = useMemo(() => countOccupiedSeats(teamSeats, employeeById), [teamSeats, employeeById])

  // STEP B1: 編集中セルの選択(席か空セルのどちらか1件だけ)。編集モードを抜けると自動で消える
  const seatSelection = useSeatSelection(editMode.isEditMode)

  // 編集セッションの配線(選択のトグル・席追加とハイライト・配属シート・一括配置・保存/取消・
  // 編集中の閉じるガード)はuse-overlay-edit-wiringの1本にまとめてある
  const {
    handleSelectSeat,
    handleAddSeat,
    assignSeatId,
    assignTargetSeat,
    assignEmployees,
    draftAppliedSeats,
    assignInitialBulkMode,
    handleAssignSeat,
    handleAssignSelect,
    handleAssignSelectRequiringConfirm,
    assignConfirm,
    confirmAssignSelect,
    cancelAssignSelect,
    handleAssignClear,
    handleAssignClose,
    bulkAssign,
    handleBulkAssignRequest,
    handleBulkAssignSelected,
    handleOpenBulkAssign,
    canOpenBulkAssign,
    freeAddressEnabled,
    toggleFreeAddress,
    requestSeatDelete,
    requestSeatDeleteAtCell,
    seatDeleteConfirm,
    confirmSeatDelete,
    cancelSeatDelete,
    seatCommit,
    handleSaveEdit,
    handleCancelEdit,
    hasEditChanges,
    isDiscardConfirmOpen,
    confirmDiscardClose,
    cancelDiscardClose,
    isTeamDeleteConfirmOpen,
    requestTeamDelete,
    confirmTeamDelete,
    cancelTeamDelete,
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

  // STEP B2/B3: 編集中セルのドラッグ移動/入替とゴミ箱への削除。moveSeatはuseOverlayEditModeの
  // grid差分適用口をそのまま渡す。§07-2: ゴミ箱投下(このフック内部のタッチ経路+後段の
  // TrashDropZoneのマウス経路、両方がこの1つの引数を呼ぶ)は即時削除ではなく確認要求
  // (requestSeatDeleteAtCell)へ差し替え、§06-2セルの削除ボタンと同じ確認モーダルへ合流させる
  const seatDrag = useSeatDrag({ moveSeat: editMode.moveSeat, removeSeatAtCell: requestSeatDeleteAtCell })

  // 下スワイプで閉じるのは Compact だけの挙動。内部スクロールが上端かどうかの判定は
  // フック側(computeScrollGate)がイベント経路から遡って行うため bodyRef は渡さない
  const sheetRef = useRef<HTMLDivElement>(null)
  const { sheetHandlers, dragStyle } = useSwipeToDismiss({
    onDismiss: guardedClose,
    enabled: payload !== null && isCompactMobile,
  })
  // useModalShell(フォーカストラップ)へ渡す実ノード参照と、フックのシート root 登録を1つの ref に束ねる。
  // 毎レンダー新しい関数を渡すと背景スクロール連鎖ガードが着脱を繰り返すため参照を固定する
  const setSheetNode = useCallback(
    (node: HTMLDivElement | null) => {
      sheetRef.current = node
      sheetHandlers.ref(node)
    },
    [sheetHandlers.ref]
  )
  useModalShell(payload !== null, sheetRef, guardedClose)

  // 座席配置ガイド。分岐なし2ステップで自動再生はせず、ヘッダーのガイドボタンから
  // 再生する度に既読を無視して最初から出す(既読フラグの無効化=replayNonceの加算)
  const [tourReplayNonce, setTourReplayNonce] = useState(0)
  const tour = useCoachMarkTour({
    steps: SEAT_LAYOUT_TOUR_STEPS,
    storageKey: SEAT_LAYOUT_TOUR_STORAGE_KEY,
    replayNonce: tourReplayNonce,
    autoStart: false,
  })
  const handleHelp = useCallback(() => setTourReplayNonce((count) => count + 1), [])

  if (!payload) return null

  const { teamColor, teamName, rect } = payload
  const sidePadding = isCompactMobile ? COMPACT_SIDE_PADDING_PX : 0
  const teamRect: Rect = minimapTeamArea ?? { x: 0, y: 0, w: 0, h: 0 }
  return (
    <div
      className={`${styles.wrap}${isCompactMobile ? ` ${styles.isCompact}` : ''}`}
      onClick={(e) => {
        // ラッパー余白クリックで閉じる(パネル自身のクリックは stopPropagation)
        if (e.target === e.currentTarget) guardedClose()
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
              onHelp={handleHelp}
              canBulkAssign={canOpenBulkAssign}
              onBulkAssign={handleOpenBulkAssign}
              freeAddressEnabled={freeAddressEnabled}
              onToggleFreeAddress={toggleFreeAddress}
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
        assignSeatId={assignSeatId}
        assignTargetSeat={assignTargetSeat}
        assignEmployees={assignEmployees}
        draftAppliedSeats={draftAppliedSeats}
        employeeById={employeeById}
        assignInitialBulkMode={assignInitialBulkMode}
        onAssignSelect={handleAssignSelect}
        onAssignSelectRequiringConfirm={handleAssignSelectRequiringConfirm}
        onAssignClear={handleAssignClear}
        onAssignClose={handleAssignClose}
        onBulkAssignRequest={handleBulkAssignRequest}
        onBulkAssignSelected={handleBulkAssignSelected}
        assignConfirm={assignConfirm}
        onConfirmAssignSelect={confirmAssignSelect}
        onCancelAssignSelect={cancelAssignSelect}
        bulkAssign={bulkAssign}
        seatDeleteConfirm={seatDeleteConfirm}
        onConfirmSeatDelete={confirmSeatDelete}
        onCancelSeatDelete={cancelSeatDelete}
        isDiscardConfirmOpen={isDiscardConfirmOpen}
        onConfirmDiscardClose={confirmDiscardClose}
        onCancelDiscardClose={cancelDiscardClose}
        isTeamDeleteConfirmOpen={isTeamDeleteConfirmOpen}
        teamName={teamName}
        occupiedCount={occupiedCount}
        emptySeatCount={teamSeats.length - occupiedCount}
        onConfirmTeamDelete={confirmTeamDelete}
        onCancelTeamDelete={cancelTeamDelete}
      />
      {/* 座席配置ガイド。.panel は指追従の transform を受けるため、fixed 基準のスポットライトが
          その中にあると座標系がずれる。.wrap(fixed・transform なし)直下に置いて基準を分ける */}
      <CoachMarkTour tour={tour} />
    </div>
  )
}
