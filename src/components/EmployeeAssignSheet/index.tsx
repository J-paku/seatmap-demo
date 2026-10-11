import { useBulkSelection } from './hooks/use-bulk-selection'
import { useEmployeeAssign } from './hooks/use-employee-assign'
import { buildSeatNote, labelBulkDepartment } from './utils/build-sheet-labels'
import { canOpenSheet, checkTargetSeatEmpty, findSeatOccupant } from './utils/resolve-target-seat'
import { selectCandidate } from './utils/route-assign-choice'
import { PickerSheet } from '@/components/PickerSheet'
import { PixelAvatar } from '@/components/PixelAvatar'
import { useEmployeeAvatar } from '@/hooks/use-employee-avatar'
import type { Employee, Seat } from '@/types'
import styles from '../object-picker.module.css'

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

const CandidateRow = ({
  employee,
  seatedAt,
  onSelect,
}: {
  employee: Employee
  seatedAt: string | null
  onSelect: () => void
}) => {
  const avatar = useEmployeeAvatar(employee)
  return (
    <button type='button' className={styles.assignRow} onClick={onSelect}>
      {avatar && <PixelAvatar config={avatar} size={32} ariaLabel='' />}
      <span className={styles.assignRowText}>
        <span className={styles.assignRowName}>{employee.name}</span>
        <span className={styles.assignRowMeta}>
          {employee.position ? `${employee.position} / ` : ''}
          {employee.team}
        </span>
      </span>
      {seatedAt && (
        <span className={styles.assignRowSeated}>
          着席中
          <span className={styles.assignRowSeatId}>{seatedAt}</span>
        </span>
      )}
      {/* §06-4: 行末尾アイコン。配属済み=swap_horiz(選ぶと移動) / 未配属=add_circle(選ぶと新規配属) */}
      <span
        className='icon-msr-thin'
        aria-hidden='true'
        style={{
          marginLeft: seatedAt ? 6 : 'auto',
          color: 'var(--color-text-secondary)',
          fontSize: 20,
        }}
      >
        {seatedAt ? 'swap_horiz' : 'add_circle'}
      </span>
    </button>
  )
}

const BulkMemberRow = ({
  employee,
  seatedAt,
  isChecked,
  onToggle,
}: {
  employee: Employee
  seatedAt: string | null
  isChecked: boolean
  onToggle: () => void
}) => {
  const avatar = useEmployeeAvatar(employee)
  return (
    <label className={styles.assignRow} style={{ cursor: 'pointer' }}>
      <input
        type='checkbox'
        checked={isChecked}
        onChange={onToggle}
        style={{ width: 18, height: 18, flexShrink: 0 }}
      />
      {avatar && <PixelAvatar config={avatar} size={32} ariaLabel='' />}
      <span className={styles.assignRowText}>
        <span className={styles.assignRowName}>{employee.name}</span>
        <span className={styles.assignRowMeta}>
          {employee.position ? `${employee.position} / ` : ''}
          {employee.team}
        </span>
      </span>
      {seatedAt && (
        <span className={styles.assignRowSeated}>
          着席中
          <span className={styles.assignRowSeatId}>{seatedAt}</span>
        </span>
      )}
    </label>
  )
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

  const bulkDepartmentLabel = labelBulkDepartment(currentDepartment)

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
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              marginTop: 8,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
              {bulkDepartmentLabel}
            </span>
            <button
              type='button'
              className='pixel-btn'
              aria-label={`${bulkDepartmentLabel}を一括選択`}
              onClick={toggleBulkDepartmentAll}
            >
              一括選択
            </button>
          </div>
          <div className={styles.assignList}>
            {bulkMembers.map(candidate => (
              <BulkMemberRow
                key={candidate.employee.id}
                employee={candidate.employee}
                seatedAt={candidate.seatedAt}
                isChecked={selectedBulkIds.has(candidate.employee.id)}
                onToggle={() => toggleBulkMember(candidate.employee.id)}
              />
            ))}
            {bulkMembers.length === 0 && (
              <p className={styles.assignEmpty}>該当する社員がいません</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type='button' className='pixel-btn' style={{ flex: 1 }} onClick={exitBulkMode}>
              キャンセル
            </button>
            <button
              type='button'
              className={`pixel-btn ${styles.assignBulk}`}
              style={{ flex: 1, width: 'auto', marginTop: 0 }}
              disabled={selectedBulkIds.size === 0}
              onClick={confirmBulkAssign}
            >
              一括配置（{selectedBulkIds.size}）
            </button>
          </div>
        </>
      ) : (
        <>
          <input
            type='search'
            role='searchbox'
            className={styles.assignSearch}
            placeholder='名前・カナ・部署・社員番号で検索'
            aria-label='社員を検索'
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          {onBulkAssign && canBulkAssign && (
            <button
              type='button'
              className={`pixel-btn ${styles.assignBulk}`}
              aria-label='部署メンバーを一括取込'
              onClick={enterBulkMode}
            >
              部署一括取込
            </button>
          )}
          {occupant && (
            <button type='button' className={`pixel-btn ${styles.assignClear}`} onClick={onClear}>
              この席を空席にする
            </button>
          )}
          <div className={styles.assignList}>
            {departmentGroups.map(group => {
              const isExpanded = expandedDepartments.has(group.department)
              return (
                <div
                  key={group.department}
                  style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                >
                  <button
                    type='button'
                    className={styles.assignRow}
                    style={{ fontWeight: 700 }}
                    aria-expanded={isExpanded}
                    onClick={() => toggleDepartment(group.department)}
                  >
                    <span className='icon-msr-thin' aria-hidden='true' style={{ fontSize: 18 }}>
                      {isExpanded ? 'expand_more' : 'chevron_right'}
                    </span>
                    <span className={styles.assignRowText}>
                      <span className={styles.assignRowName}>{group.department}</span>
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {group.candidates.length}名
                    </span>
                  </button>
                  {isExpanded &&
                    group.candidates.map(candidate => (
                      <CandidateRow
                        key={candidate.employee.id}
                        employee={candidate.employee}
                        seatedAt={candidate.seatedAt}
                        onSelect={() =>
                          selectCandidate(candidate, onSelect, onSelectRequiringConfirm)
                        }
                      />
                    ))}
                </div>
              )
            })}
            {departmentGroups.length === 0 && (
              <p className={styles.assignEmpty}>該当する社員がいません</p>
            )}
          </div>
        </>
      )}
    </PickerSheet>
  )
}
