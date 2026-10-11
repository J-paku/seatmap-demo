import { BulkMemberRow } from './BulkMemberRow'
import { labelBulkDepartment } from '../utils/build-sheet-labels'
import type { AssignCandidate } from '../utils/group-assign-candidates'
import styles from '@/components/object-picker.module.css'

// 一括選択モードの中身。対象部署の見出しと一括選択・社員のチェック一覧・キャンセルと一括配置

type Props = {
  currentDepartment: string | null
  bulkMembers: AssignCandidate[]
  selectedBulkIds: Set<string>
  toggleBulkMember: (employeeId: string) => void
  toggleBulkDepartmentAll: () => void
  exitBulkMode: () => void
  confirmBulkAssign: () => void
}

export const BulkPanel = ({
  currentDepartment,
  bulkMembers,
  selectedBulkIds,
  toggleBulkMember,
  toggleBulkDepartmentAll,
  exitBulkMode,
  confirmBulkAssign,
}: Props) => {
  const bulkDepartmentLabel = labelBulkDepartment(currentDepartment)

  return (
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
        {bulkMembers.length === 0 && <p className={styles.assignEmpty}>該当する社員がいません</p>}
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
  )
}
