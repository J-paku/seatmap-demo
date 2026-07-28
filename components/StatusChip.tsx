import type { PresenceStatus } from '@/lib/types'
import { PRESENCE_LABEL } from '@/lib/types'

const STATUS_VAR: Record<PresenceStatus, string> = {
  present: 'var(--color-status-present)',
  meeting: 'var(--color-status-meeting)',
  out: 'var(--color-status-out)',
  vacation: 'var(--color-status-vacation)',
}

// 在席ステータスのチップ
export const StatusChip = ({ status }: { status: PresenceStatus }) => (
  <span className='status-chip' style={{ ['--status-color' as string]: STATUS_VAR[status] }}>
    <span className='status-chip-dot' />
    {PRESENCE_LABEL[status]}
  </span>
)
