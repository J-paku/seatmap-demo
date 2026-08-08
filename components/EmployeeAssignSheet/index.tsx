import { useEmployeeAssign } from './hooks/use-employee-assign'
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
  // STEP C3: オーバーレイ経由の時だけ渡す。渡された時だけ「この部署をまとめて配属」を出す
  // (キャンバス編集のSeatMapViewは渡さないため、既存の個別配属導線は影響を受けない)
  onBulkAssign?: () => void
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
    </button>
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
  onBulkAssign,
}: Props) => {
  const { query, setQuery, candidates, canBulkAssign } = useEmployeeAssign(employees, seats, seat)
  const occupant = seat?.employeeId ? employeeById.get(seat.employeeId) ?? null : null

  return (
    <PickerSheet
      isOpen={isOpen && seat !== null}
      title={seat ? `${seat.id} に配属` : '配属'}
      note={occupant ? `現在は${occupant.name}さんが着席しています` : '空席です'}
      onClose={onClose}
    >
      <input
        type='search'
        role='searchbox'
        className={styles.assignSearch}
        placeholder='氏名・カナ・部署で絞り込む'
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      {onBulkAssign && canBulkAssign && (
        <button type='button' className={`pixel-btn ${styles.assignBulk}`} onClick={onBulkAssign}>
          この部署をまとめて配属
        </button>
      )}
      {occupant && (
        <button type='button' className={`pixel-btn ${styles.assignClear}`} onClick={onClear}>
          この席を空席にする
        </button>
      )}
      <div className={styles.assignList}>
        {candidates.map((candidate) => (
          <CandidateRow
            key={candidate.employee.id}
            employee={candidate.employee}
            seatedAt={candidate.seatedAt}
            onSelect={() => onSelect(candidate.employee.id)}
          />
        ))}
        {candidates.length === 0 && <p className={styles.assignEmpty}>該当する社員がいません</p>}
      </div>
    </PickerSheet>
  )
}
