import type { Facility, ScheduleEvent } from '@/types'
import { isScheduleMasked } from '@/utils/format'

// 予定システムの施設ID(Facility.facilityId)→ 会議室名。レイアウト上の Facility.id ではなく
// 施設ID側を鍵にする。予定(ScheduleEvent.facilityId)が持つのはこちらのため
export const facilityNameByFacilityId = (facilities: Facility[]): Map<string, string> => {
  const map = new Map<string, string>()
  for (const f of facilities) {
    if (f.facilityId) map.set(f.facilityId, f.name)
  }
  return map
}

// 表示に出す会議室名。非公開予定は件名だけでなく押さえた会議室も伏せる
// (部屋から会議を辿れてしまうため。件名だけ伏せても防御にならない)
export const visibleFacilityName = (event: ScheduleEvent, facilityName: string | undefined): string | undefined =>
  isScheduleMasked(event) ? undefined : facilityName
