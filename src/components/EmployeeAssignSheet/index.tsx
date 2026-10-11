import { BulkPanel } from './components/BulkPanel'
import { SearchPanel } from './components/SearchPanel'
import { useBulkSelection } from './hooks/use-bulk-selection'
import { useEmployeeAssign } from './hooks/use-employee-assign'
import { buildSeatNote } from './utils/build-sheet-labels'
import { canOpenSheet, checkTargetSeatEmpty, findSeatOccupant } from './utils/resolve-target-seat'
import { PickerSheet } from '@/components/PickerSheet'
import type { Employee, Seat } from '@/types'

// 空席・着席席へ座らせる社員を選ぶ。着席中の社員は座席IDつきで示し、
// 選ぶと移動(または入れ替え)になることを事前に伝える

type Props = {
  isOpen: boolean
  seat: Seat | null
  employees: Employee[]
  seats: Seat[]
  employeeById: Map<string, Employee>
  onSelect: (employeeId: string) => void
  onClear: () => void
  onClose: () => void
  // §07-4: 対象が空席×未配属者以外(移動・差し替え)は確認が要る。渡された時だけその経路を使い、
  // 未提供時はonSelectへ直接フォールバックする(現行呼び出し元はまだ確認モーダルを持たないため、
  // 実際の文言・ダイアログの接続は別ラウンド担当。ここでは分岐と呼び出し口だけを用意する)
  onSelectRequiringConfirm?: (employeeId: string) => void
  // STEP C3: オーバーレイ経由の時だけ渡す。渡された時だけ「部署一括取込」を出す
  // (キャンバス編集のSeatMapViewは渡さないため、既存の個別配属導線は影響を受けない)
  onBulkAssign?: () => void
  // §06-4 E: チェックボックスで選んだ社員IDを添えた一括配置。渡されればこちらを呼ぶ。
  // 未提供時はonBulkAssignへフォールバックする(部署全員を即時配置する現行挙動のまま)。
  // 選択したN人だけを実際に配置するロジックはuse-bulk-assign.ts(担当外)の対応待ち
  onBulkAssignSelected?: (employeeIds: string[]) => void
  // §06-4: 編集モードヘッダーの「部署一括取込」から開いた時にtrueを渡すと、
  // シートを開いた時点でチェックボックスの一括選択モードになる。省略時はfalseで、
  // 従来通りシート内の「部署一括取込」ボタン(下記)を押すまで単体検索モードのまま
  initialBulkMode?: boolean
}

export const EmployeeAssignSheet = ({
  isOpen,
  seat,
  employees,
  seats,
  employeeById,
  onSelect,
  onClear,
  onClose,
  onSelectRequiringConfirm,
  onBulkAssign,
  onBulkAssignSelected,
  initialBulkMode = false,
}: Props) => {
  const isTargetSeatEmpty = checkTargetSeatEmpty(seat, employeeById)
  const {
    query,
    setQuery,
    departmentGroups,
    expandedDepartments,
    toggleDepartment,
    canBulkAssign,
    bulkMembers,
    currentDepartment,
  } = useEmployeeAssign(employees, seats, seat, isTargetSeatEmpty)
  const occupant = findSeatOccupant(seat, employeeById)

  const {
    isBulkMode,
    selectedBulkIds,
    enterBulkMode,
    exitBulkMode,
    toggleBulkMember,
    toggleBulkDepartmentAll,
    confirmBulkAssign,
  } = useBulkSelection(initialBulkMode, bulkMembers, onBulkAssignSelected, onBulkAssign)

  return (
    <PickerSheet
      isOpen={canOpenSheet(isOpen, seat)}
      title='座席配置'
      icon='person_search'
      ariaLabel='社員検索'
      note={buildSeatNote(occupant)}
      onClose={onClose}
    >
      {isBulkMode ? (
        <BulkPanel
          currentDepartment={currentDepartment}
          bulkMembers={bulkMembers}
          selectedBulkIds={selectedBulkIds}
          toggleBulkMember={toggleBulkMember}
          toggleBulkDepartmentAll={toggleBulkDepartmentAll}
          exitBulkMode={exitBulkMode}
          confirmBulkAssign={confirmBulkAssign}
        />
      ) : (
        <SearchPanel
          query={query}
          setQuery={setQuery}
          onBulkAssign={onBulkAssign}
          canBulkAssign={canBulkAssign}
          enterBulkMode={enterBulkMode}
          occupant={occupant}
          onClear={onClear}
          departmentGroups={departmentGroups}
          expandedDepartments={expandedDepartments}
          toggleDepartment={toggleDepartment}
          onSelect={onSelect}
          onSelectRequiringConfirm={onSelectRequiringConfirm}
        />
      )}
    </PickerSheet>
  )
}
