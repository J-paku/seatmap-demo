import { findHoverFacility } from '../utils/find-hover-facility'
import { FacilityHoverCard } from '@/components/FacilityHoverCard'
import type { FacilityHoverPayload } from '@/components/FacilityHoverCard'
import type { FacilityState } from '@/utils/facility-status'
import type { Employee, Facility } from '@/types'

// ホバー中の会議室のカード。会議室か状態が引けないときは何も出さない

type Props = {
  hoverFacility: FacilityHoverPayload
  facilities: Facility[]
  facilityStateById: Map<string, FacilityState>
  employeeById: Map<string, Employee>
}

export const FacilityHoverLayer = ({
  hoverFacility,
  facilities,
  facilityStateById,
  employeeById,
}: Props) => {
  const found = findHoverFacility(facilities, facilityStateById, hoverFacility.facilityId)
  return found ? (
    <FacilityHoverCard
      facility={found.facility}
      state={found.state}
      empById={employeeById}
      rect={hoverFacility.rect}
    />
  ) : null
}
