import { DepartmentTree } from './DepartmentTree'
import type { AssignDepartmentGroup } from '../utils/group-assign-candidates'
import type { Employee } from '@/types'
import styles from '@/components/object-picker.module.css'

// 単体検索モードの中身。検索欄・部署一括取込の入口・空席にするボタン・部署ツリー

type Props = {
  query: string
  setQuery: (query: string) => void
  onBulkAssign?: () => void
  canBulkAssign: boolean
  enterBulkMode: () => void
  occupant: Employee | null
  onClear: () => void
  departmentGroups: AssignDepartmentGroup[]
  expandedDepartments: Set<string>
  toggleDepartment: (department: string) => void
  onSelect: (employeeId: string) => void
  onSelectRequiringConfirm?: (employeeId: string) => void
}

export const SearchPanel = ({
  query,
  setQuery,
  onBulkAssign,
  canBulkAssign,
  enterBulkMode,
  occupant,
  onClear,
  departmentGroups,
  expandedDepartments,
  toggleDepartment,
  onSelect,
  onSelectRequiringConfirm,
}: Props) => (
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
    <DepartmentTree
      departmentGroups={departmentGroups}
      expandedDepartments={expandedDepartments}
      toggleDepartment={toggleDepartment}
      onSelect={onSelect}
      onSelectRequiringConfirm={onSelectRequiringConfirm}
    />
  </>
)
