import type { Facility } from '@/lib/types'

// 施設ブロック(名称+capacity 表記)。タップで施設詳細を開く
type Props = {
  facility: Facility
  counterScale: number
  onSelect: (facilityId: string) => void
}

export const FacilityBlock = ({ facility, counterScale, onSelect }: Props) => (
  <div
    className='facility-block'
    data-kind={facility.kind}
    role='button'
    tabIndex={-1}
    onClick={() => onSelect(facility.id)}
    style={{
      left: facility.x,
      top: facility.y,
      width: facility.width,
      height: facility.height,
      cursor: 'pointer',
    }}
  >
    <span className='facility-name' style={{ fontSize: 15 * counterScale }}>
      {facility.name}
    </span>
    {facility.kind === 'meeting' && facility.capacity != null && (
      <span className='facility-capacity' style={{ fontSize: 12 * counterScale }}>
        定員{facility.capacity}名
      </span>
    )}
  </div>
)
