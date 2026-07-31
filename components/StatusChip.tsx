import type { PresenceStatus } from '@/types'
import { PRESENCE_LABEL } from '@/utils/format'

type PresenceBadgeProps = {
  // 表示可否(仮想座席・非当日は呼び出し側で false を渡す=優先度1)
  visible: boolean
  // 在席者のスケジュール取得中か(優先度2)
  isLoading: boolean
  // 座席が埋まっているか(優先度4のフォールバック判定用)
  isOccupied: boolean
  status?: PresenceStatus
}

const STATUS_VAR: Record<PresenceStatus, string> = {
  present: 'var(--color-status-present)',
  meeting: 'var(--color-status-meeting)',
  out: 'var(--color-status-out)',
  vacation: 'var(--color-status-vacation)',
}

// 在席ステータスのチップ(優先度3: 状態確定時)
export const StatusChip = ({ status }: { status: PresenceStatus }) => (
  <span className='status-chip' style={{ ['--status-color' as string]: STATUS_VAR[status] }}>
    <span className='status-chip-dot' />
    {PRESENCE_LABEL[status]}
  </span>
)

// 12: 社員詳細の状態バッジ。4段優先度のうち先に該当した1つのみ描画する
// 優先度1(非表示)の時はラッパーごと何も描画しない(コンテナだけ残る空 div を防ぐ)
export const PresenceBadge = ({ visible, isLoading, isOccupied, status }: PresenceBadgeProps) => {
  if (!visible) return null
  return (
    <div className='profile-status-badge'>
      {isOccupied && isLoading ? (
        <span className='status-chip status-chip-loading'>
          <span className='material-symbols-outlined' style={{ fontSize: 14 }}>
            progress_activity
          </span>
          読み込み中
        </span>
      ) : status ? (
        <StatusChip status={status} />
      ) : (
        <span className={`status-chip ${isOccupied ? 'status-chip-inuse' : 'status-chip-vacant'}`}>
          {isOccupied ? '使用中' : '空席'}
        </span>
      )}
    </div>
  )
}
