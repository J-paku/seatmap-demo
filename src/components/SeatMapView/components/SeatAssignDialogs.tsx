import type { SeatAssign } from '../hooks/use-seat-assign'
import { EmployeeAssignSheet } from '@/components/EmployeeAssignSheet'
import { ConfirmDialog } from '@/components/edit/ConfirmDialog'
import type { Employee, Seat } from '@/types'

// 編集セッション中だけ出る座席まわりの面。配属シートと、その確認 + 一括削除の確認。
// 削除・ロック等のオブジェクト系ダイアログは EditDialogs が持つ

type Props = {
  assign: SeatAssign
  employees: Employee[]
  seats: Seat[]
  employeeById: Map<string, Employee>
  // 2席以上の一括削除の対象。null なら確認を出さない
  bulkDeleteSeatIds: string[] | null
  onConfirmBulkDelete: () => void
  onCancelBulkDelete: () => void
}

export const SeatAssignDialogs = ({
  assign,
  employees,
  seats,
  employeeById,
  bulkDeleteSeatIds,
  onConfirmBulkDelete,
  onCancelBulkDelete,
}: Props) => (
  <>
    <EmployeeAssignSheet
      isOpen={assign.assignSeatId !== null}
      seat={assign.assignTargetSeat}
      employees={employees}
      seats={seats}
      employeeById={employeeById}
      onSelect={assign.requestAssign}
      onClear={() => assign.requestAssign(null)}
      onClose={assign.closeAssign}
    />
    {assign.pendingPlan?.confirmMessage && (
      <ConfirmDialog
        ariaLabel='配属の確認'
        message={assign.pendingPlan.confirmMessage}
        confirmLabel='実行する'
        onConfirm={assign.confirmAssign}
        onCancel={assign.cancelAssign}
      />
    )}
    {/* 07-2 の一括削除確認。タイトル行・アイコンバッジ・× を持つ 07-1 の共通シェルは別担当で、
        ここは本文と主ボタン文言だけを仕様どおりに渡す */}
    {bulkDeleteSeatIds && (
      <ConfirmDialog
        ariaLabel={`${bulkDeleteSeatIds.length}席を削除しますか？`}
        message={`選択した${bulkDeleteSeatIds.length}席を削除します。配置済みの社員は解除されます。この操作は保存後に確定されます。`}
        confirmLabel='削除する'
        onConfirm={onConfirmBulkDelete}
        onCancel={onCancelBulkDelete}
      />
    )}
  </>
)
