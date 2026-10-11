import { ScheduleSyncBadge } from './ScheduleSyncBadge'
import { SeatGridFrame } from './SeatGridFrame'
import { SeatLayoutHeader } from './SeatLayoutHeader'
import { TrashDropZone } from './TrashDropZone'
import type { UseOverlayEditModeResult } from '../hooks/use-overlay-edit-mode'
import type { UseOverlayEditWiringResult } from '../hooks/use-overlay-edit-wiring'
import type { OverlaySession } from '../hooks/use-overlay-session'
import type { UseSeatDragResult } from '../hooks/use-seat-drag'
import type { UseSeatSelectionResult } from '../hooks/use-seat-selection'
import { resolveSidePadding } from '../utils/resolve-side-padding'
import type { SeatGrid } from '../type'
import styles from '../team-overlay-modal.module.css'
import { SeatDeleteProvider } from '@/contexts/seat-delete-context'
import type { Employee, PresenceStatus, Seat, TeamOverlayPayload } from '@/types'

// 座席配置セクション。見出し → 同期バッジ → (ドラッグ中だけ)ゴミ箱 → 座席グリッドの順に並べる。
// 状態は持たず、index.tsx が呼んだフックの戻り値を束のまま受け取って下位部品へ配るだけ

export type SeatLayoutSectionProps = {
  payload: TeamOverlayPayload
  isCompactMobile: boolean
  // 開いた直後の読込と、同期バッジ用のスケジュール取得状態
  session: OverlaySession
  // 開いているチームの座席(保存済み)。見出しの席数に使う
  teamSeats: Seat[]
  // 表示用グリッド(編集中は下書きを反映済み)
  seatGrid: SeatGrid
  editMode: UseOverlayEditModeResult
  edit: UseOverlayEditWiringResult
  seatDrag: UseSeatDragResult
  seatSelection: UseSeatSelectionResult
  employeeById: Map<string, Employee>
  presenceMap: Map<string, PresenceStatus>
  highlightSeatId: string | null
  onSeatClick: (seatId: string) => void
  onClearHighlight?: () => void
  // 座席配置ガイドの再生口
  onHelp: () => void
}

export const SeatLayoutSection = ({
  payload: { teamName, teamColor },
  isCompactMobile,
  session: { loading, syncedAtMs, syncCooldown, isSyncing, retrySync },
  teamSeats,
  seatGrid,
  editMode,
  edit: {
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
    handleCancelEdit,
  },
  seatDrag,
  seatSelection,
  employeeById,
  presenceMap,
  highlightSeatId,
  onSeatClick,
  onClearHighlight,
  onHelp,
}: SeatLayoutSectionProps) => {
  const sidePadding = resolveSidePadding(isCompactMobile)
  return (
    <section className={styles.section}>
      <SeatLayoutHeader
        seatCount={teamSeats.length}
        sidePadding={sidePadding}
        isCompactMobile={isCompactMobile}
        isEditMode={editMode.isEditMode}
        isSaving={seatCommit.isSaving}
        onEnterEdit={handleEnterEdit}
        onExitEdit={handleCancelEdit}
        onHelp={onHelp}
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
  )
}
