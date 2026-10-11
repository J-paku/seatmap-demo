import { useState } from 'react'
import type { AssignCandidate } from '../utils/group-assign-candidates'
import { submitBulkAssign } from '../utils/route-assign-choice'
import { toggleAllSelected, toggleSelectedId } from '../utils/toggle-bulk-selection'

// 部署一括取込の選択モード。モードの出入り・チェックした社員IDの集合・確定を持つ。
// 出入りのたびに選択を空に戻し、確定したら選んだ結果を呼び出し側の口へ渡してモードを出る

export type BulkSelection = {
  isBulkMode: boolean
  selectedBulkIds: Set<string>
  enterBulkMode: () => void
  exitBulkMode: () => void
  toggleBulkMember: (employeeId: string) => void
  toggleBulkDepartmentAll: () => void
  confirmBulkAssign: () => void
}

export const useBulkSelection = (
  initialBulkMode: boolean,
  bulkMembers: AssignCandidate[],
  onBulkAssignSelected: ((employeeIds: string[]) => void) | undefined,
  onBulkAssign: (() => void) | undefined
): BulkSelection => {
  const [isBulkMode, setIsBulkMode] = useState(initialBulkMode)
  const [selectedBulkIds, setSelectedBulkIds] = useState<Set<string>>(new Set())

  const enterBulkMode = () => {
    setSelectedBulkIds(new Set())
    setIsBulkMode(true)
  }

  const exitBulkMode = () => {
    setIsBulkMode(false)
    setSelectedBulkIds(new Set())
  }

  const toggleBulkMember = (employeeId: string) => {
    setSelectedBulkIds(prev => toggleSelectedId(prev, employeeId))
  }

  const toggleBulkDepartmentAll = () => {
    setSelectedBulkIds(prev => toggleAllSelected(prev, bulkMembers))
  }

  const confirmBulkAssign = () => {
    submitBulkAssign(selectedBulkIds, onBulkAssignSelected, onBulkAssign)
    exitBulkMode()
  }

  return {
    isBulkMode,
    selectedBulkIds,
    enterBulkMode,
    exitBulkMode,
    toggleBulkMember,
    toggleBulkDepartmentAll,
    confirmBulkAssign,
  }
}
