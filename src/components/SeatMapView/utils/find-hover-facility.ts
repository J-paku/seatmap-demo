import type { FacilityState } from '@/utils/facility-status'
import type { Facility } from '@/types'

// ホバーカードに出す会議室とその状態。どちらかが引けなければカードを出さない
export const findHoverFacility = (
  facilities: Facility[],
  facilityStateById: Map<string, FacilityState>,
  facilityId: string
): { facility: Facility; state: FacilityState } | null => {
  const facility = facilities.find(x => x.id === facilityId)
  const state = facilityStateById.get(facilityId)
  return facility && state ? { facility, state } : null
}
