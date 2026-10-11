import { CandidateRow } from './CandidateRow'
import type { AssignDepartmentGroup } from '../utils/group-assign-candidates'
import { selectCandidate } from '../utils/route-assign-choice'
import styles from '@/components/object-picker.module.css'

// 単体検索の部署ツリー。部署の見出しで開閉し、開いた部署の候補を並べる

type Props = {
  departmentGroups: AssignDepartmentGroup[]
  expandedDepartments: Set<string>
  toggleDepartment: (department: string) => void
  onSelect: (employeeId: string) => void
  onSelectRequiringConfirm?: (employeeId: string) => void
}

export const DepartmentTree = ({
  departmentGroups,
  expandedDepartments,
  toggleDepartment,
  onSelect,
  onSelectRequiringConfirm,
}: Props) => (
  <div className={styles.assignList}>
    {departmentGroups.map(group => {
      const isExpanded = expandedDepartments.has(group.department)
      return (
        <div key={group.department} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
                onSelect={() => selectCandidate(candidate, onSelect, onSelectRequiringConfirm)}
              />
            ))}
        </div>
      )
    })}
    {departmentGroups.length === 0 && <p className={styles.assignEmpty}>該当する社員がいません</p>}
  </div>
)
