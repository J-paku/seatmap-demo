import { useScheduleRefresh } from '@/hooks/use-schedule-refresh'
import { FACILITY_COLOR, FACILITY_STATUS_LABEL } from '@/utils/facility-status'
import type { FacilityStatus } from '@/types'
import styles from '../facility-detail.module.css'
import sheetStyles from '@/components/sheet.module.css'

// 施設パネルのヘッダー: アイコン・施設名・更新ボタン(クールダウン付き)・状態バッジ・閉じるボタン
// 状態バッジは isTodaySelected が true の時だけ描画する(本日以外は概念自体が無い)

type Props = {
  facilityName: string
  status: FacilityStatus
  isTodaySelected: boolean
  onClose: () => void
}

export const FacilityPanelHeader = ({ facilityName, status, isTodaySelected, onClose }: Props) => {
  const { isRefreshing, cooldown, refresh } = useScheduleRefresh()
  const color = FACILITY_COLOR[status]

  return (
    <div className={styles.facPanelHeader}>
      <span className={`icon-msr-filled ${styles.facPanelIcon}`} aria-hidden='true'>
        meeting_room
      </span>
      <span className={styles.facPanelName}>{facilityName}</span>
      <button
        type='button'
        className={styles.facRefreshBtn}
        aria-label='会議室情報を更新'
        disabled={isRefreshing || cooldown > 0}
        onClick={refresh}
      >
        <span className={`icon-msr-filled ${styles.facRefreshIcon}${isRefreshing ? ` ${styles.isRefreshing}` : ''}`} aria-hidden='true'>
          refresh
        </span>
        {cooldown > 0 && <span className={styles.facRefreshCooldown}>{cooldown}s</span>}
      </button>
      <div className={styles.facPanelRight}>
        {isTodaySelected && (
          <span className={styles.facBadge} style={{ background: color.bg, color: color.text, borderColor: color.border }}>
            {FACILITY_STATUS_LABEL[status]}
          </span>
        )}
        <button
          type='button'
          className={sheetStyles.close}
          aria-label='パネルを閉じる'
          data-sheet-initial-focus
          onClick={onClose}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
