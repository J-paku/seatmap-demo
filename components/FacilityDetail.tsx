import { useFacilities } from '@/lib/mock-loader'
import { FACILITY_KIND_LABEL } from '@/lib/format'

// 施設詳細
export const FacilityDetail = ({ facilityId }: { facilityId: string }) => {
  const { data: facilities } = useFacilities()
  const facility = facilities?.find((f) => f.id === facilityId)
  if (!facility) return null

  return (
    <div className='facility-detail'>
      <div className='detail-row'>
        <span className='detail-label'>区分</span>
        <span className='detail-value'>{FACILITY_KIND_LABEL[facility.kind]}</span>
      </div>
      {facility.kind === 'meeting' && facility.capacity != null && (
        <div className='detail-row'>
          <span className='detail-label'>定員</span>
          <span className='detail-value'>定員{facility.capacity}名</span>
        </div>
      )}
    </div>
  )
}
