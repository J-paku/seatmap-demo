import type { UseBulkAssignResult } from '../hooks/use-bulk-assign'
import type { AssignConfirmContent, SeatDeleteConfirmContent } from '../hooks/use-overlay-edit-wiring'
import { buildTeamDeleteConfirmMessage, ConfirmDialog } from '@/components/edit/ConfirmDialog'
import { DeleteConfirmDialog } from '@/components/edit/DeleteConfirmDialog'
import { EmployeeAssignSheet } from '@/components/EmployeeAssignSheet'
import { SeatMapPortal } from '@/components/SeatMapPortal'
import type { Employee, Seat } from '@/types'
import e from '@/components/edit/admin-edit.module.css'

// TeamOverlay/index.tsx から移設(01-authoring §4: indexは組み立てのみ)。配属シート(社員検索)+
// §07-4配属確認・§07-5一括移動確認・§06-3破棄確認・§07-3チーム削除確認・§07-2座席削除確認の
// 5ダイアログをまとめて描く。ロジックは持たず、use-overlay-edit-wiring が組み立てた値・
// ハンドラをそのまま並べるだけ

type Props = {
  // STEP C2/§06-4: 配属シート(社員検索)
  assignSeatId: string | null
  assignTargetSeat: Seat | null
  assignEmployees: Employee[]
  draftAppliedSeats: Seat[]
  employeeById: Map<string, Employee>
  // §06-4: このopenがヘッダーの「部署一括取込」から来たものならtrue
  assignInitialBulkMode: boolean
  onAssignSelect: (employeeId: string) => void
  onAssignSelectRequiringConfirm: (employeeId: string) => void
  onAssignClear: () => void
  onAssignClose: () => void
  onBulkAssignRequest: () => void
  onBulkAssignSelected: (employeeIds: string[]) => void
  // §07-4: 配属確認
  assignConfirm: AssignConfirmContent | null
  onConfirmAssignSelect: () => void
  onCancelAssignSelect: () => void
  // §07-5: 一括移動確認
  bulkAssign: UseBulkAssignResult
  // §06-2/§07-2: 座席削除確認。既存のDeleteConfirmDialog(components/edit/、担当外)を再利用する
  seatDeleteConfirm: SeatDeleteConfirmContent | null
  onConfirmSeatDelete: () => void
  onCancelSeatDelete: () => void
  // §06-3: 編集破棄確認
  isDiscardConfirmOpen: boolean
  onConfirmDiscardClose: () => void
  onCancelDiscardClose: () => void
  // §07-3: チーム削除確認
  isTeamDeleteConfirmOpen: boolean
  teamName: string
  occupiedCount: number
  emptySeatCount: number
  onConfirmTeamDelete: () => void
  onCancelTeamDelete: () => void
}

export const OverlayDialogs = ({
  assignSeatId,
  assignTargetSeat,
  assignEmployees,
  draftAppliedSeats,
  employeeById,
  assignInitialBulkMode,
  onAssignSelect,
  onAssignSelectRequiringConfirm,
  onAssignClear,
  onAssignClose,
  onBulkAssignRequest,
  onBulkAssignSelected,
  assignConfirm,
  onConfirmAssignSelect,
  onCancelAssignSelect,
  bulkAssign,
  seatDeleteConfirm,
  onConfirmSeatDelete,
  onCancelSeatDelete,
  isDiscardConfirmOpen,
  onConfirmDiscardClose,
  onCancelDiscardClose,
  isTeamDeleteConfirmOpen,
  teamName,
  occupiedCount,
  emptySeatCount,
  onConfirmTeamDelete,
  onCancelTeamDelete,
}: Props) => (
  // STEP C2: styles.panel は backdrop-filter + overflow:hidden で fixed 子を閉じ込めるため、
  // TrashDropZone と同じ理由で SeatMapPortal 経由で body 直下へ描く
  <SeatMapPortal>
    <EmployeeAssignSheet
      isOpen={assignSeatId !== null}
      // §06-4: assignSeatIdが変わる(=閉じてから開き直す)たびに再マウントし、
      // initialBulkModeをそのopenのモードとして再評価させる
      key={assignSeatId ?? 'closed'}
      seat={assignTargetSeat}
      employees={assignEmployees}
      seats={draftAppliedSeats}
      employeeById={employeeById}
      onSelect={onAssignSelect}
      onSelectRequiringConfirm={onAssignSelectRequiringConfirm}
      onClear={onAssignClear}
      onClose={onAssignClose}
      onBulkAssign={onBulkAssignRequest}
      onBulkAssignSelected={onBulkAssignSelected}
      initialBulkMode={assignInitialBulkMode}
    />
    {/* §07-4 配属確認。文言の組み立ては use-overlay-edit-wiring の純関数が持ち、ここは並べるだけ */}
    {assignConfirm && (
      <ConfirmDialog
        ariaLabel='配属の確認'
        title={assignConfirm.title}
        message={
          <>
            {assignConfirm.message}
            <br />
            <span className={e.editDialogSupplement}>{assignConfirm.supplement}</span>
          </>
        }
        confirmLabel={assignConfirm.confirmLabel}
        cancelLabel='キャンセル'
        role='alertdialog'
        variant='default'
        onConfirm={onConfirmAssignSelect}
        onCancel={onCancelAssignSelect}
      />
    )}
    {/* §07-5: 他所配属者(movers)がいる時だけ出す移動確認。newcomers だけなら確認を挟まない */}
    {bulkAssign.pendingPlan?.confirm && (
      <ConfirmDialog
        ariaLabel='部署一括配置の確認'
        title={bulkAssign.pendingPlan.confirm.title}
        message={
          <>
            {bulkAssign.pendingPlan.confirm.body}
            {/* §07-5: 対象一覧は最大高160pxでスクロール */}
            <span className={e.editDialogList}>
              {bulkAssign.pendingPlan.confirm.moverLabels.map((label) => (
                <span key={label} className={e.editDialogListItem}>
                  {label}
                </span>
              ))}
            </span>
            {bulkAssign.pendingPlan.confirm.newcomerNote}
          </>
        }
        confirmLabel='移動する'
        confirmIcon='swap_horiz'
        variant='default'
        hideCancel
        onConfirm={bulkAssign.confirmBulkAssign}
        onCancel={bulkAssign.cancelBulkAssign}
        onClose={bulkAssign.cancelBulkAssign}
      />
    )}
    {/* §06-2/§07-2: セルの削除・ゴミ箱投下どちらもこの1つの確認を通る。DeleteConfirmDialog
        (components/edit/、担当外)をそのまま再利用する — employeeNameがnullなら空席1席
        (完全削除)、非nullなら在席1席(空席化)の文言へその側で振り分けられる */}
    {seatDeleteConfirm && (
      <DeleteConfirmDialog
        employeeName={seatDeleteConfirm.employeeName}
        department={seatDeleteConfirm.department}
        onConfirm={onConfirmSeatDelete}
        onCancel={onCancelSeatDelete}
      />
    )}
    {/* §06-3: 編集中に閉じようとした時の破棄確認。保存せずに閉じる経路はここだけを通る */}
    {isDiscardConfirmOpen && (
      <ConfirmDialog
        ariaLabel='編集内容の破棄確認'
        message='変更を破棄して編集を終了しますか?'
        confirmLabel='破棄して終了'
        cancelLabel='キャンセル'
        onConfirm={onConfirmDiscardClose}
        onCancel={onCancelDiscardClose}
      />
    )}
    {/* §07-3: チーム削除のタイプ確認。キーワード(チーム名)を打ち切るまで確定は押せない */}
    {isTeamDeleteConfirmOpen && (
      <ConfirmDialog
        ariaLabel='チーム削除の確認'
        title='このチームを削除しますか？'
        message={buildTeamDeleteConfirmMessage(teamName, occupiedCount, emptySeatCount)}
        confirmLabel='削除する'
        cancelLabel='キャンセル'
        confirmIcon='delete_forever'
        typedConfirmation={{ keyword: teamName }}
        onConfirm={onConfirmTeamDelete}
        onCancel={onCancelTeamDelete}
      />
    )}
  </SeatMapPortal>
)
