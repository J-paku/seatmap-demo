import { useScheduleRefresh } from '@/hooks/use-schedule-refresh'
import { FACILITY_COLOR, FACILITY_STATUS_LABEL } from '@/utils/facility-status'
import type { FacilityStatus } from '@/types'

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
    <div className='fac-panel-header'>
      <span className='icon-msr-filled fac-panel-icon' aria-hidden='true'>
        meeting_room
      </span>
      <span className='fac-panel-name'>{facilityName}</span>
      <button
        type='button'
        className='fac-refresh-btn'
        aria-label='会議室情報を更新'
        disabled={isRefreshing || cooldown > 0}
        onClick={refresh}
      >
        <span className={`icon-msr-filled fac-refresh-icon${isRefreshing ? ' is-refreshing' : ''}`} aria-hidden='true'>
          refresh
        </span>
        {cooldown > 0 && <span className='fac-refresh-cooldown'>{cooldown}s</span>}
      </button>
      <div className='fac-panel-right'>
        {isTodaySelected && (
          <span className='fac-badge' style={{ background: color.bg, color: color.text, borderColor: color.border }}>
            {FACILITY_STATUS_LABEL[status]}
          </span>
        )}
        <button
          type='button'
          className='sheet-close'
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
