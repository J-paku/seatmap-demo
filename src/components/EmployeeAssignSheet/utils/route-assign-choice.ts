// 配属シートで選んだ結果を、呼び出し側が渡した口のどれへ渡すかの振り分け
import type { AssignCandidate } from './group-assign-candidates'

// §07-4: 確認が要る候補は確認の口が渡されている時だけそちらへ回す。無ければ直接選ぶ
export const selectCandidate = (
  candidate: AssignCandidate,
  onSelect: (employeeId: string) => void,
  onSelectRequiringConfirm: ((employeeId: string) => void) | undefined
): void => {
  if (candidate.needsConfirm && onSelectRequiringConfirm) {
    onSelectRequiringConfirm(candidate.employee.id)
    return
  }
  onSelect(candidate.employee.id)
}

// §06-4 E: 選んだ社員IDを受け取る口があればそちらを呼び、無ければ部署全員を配置する口へ戻す
export const submitBulkAssign = (
  selectedBulkIds: Set<string>,
  onBulkAssignSelected: ((employeeIds: string[]) => void) | undefined,
  onBulkAssign: (() => void) | undefined
): void => {
  const employeeIds = Array.from(selectedBulkIds)
  if (onBulkAssignSelected) onBulkAssignSelected(employeeIds)
  else onBulkAssign?.()
}
