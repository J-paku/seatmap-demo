import type { SeatLayout } from '@/types'

// §03-3 配置済み判定の材料。予定システムの施設ID(Facility.facilityId)を持つ分だけが
// Garoon マスタと突き合わせられる(レイアウト上の Facility.id とは別物)
export const placedFacilityIdsOf = (layout: SeatLayout | undefined): string[] =>
  layout
    ? layout.facilities
        .map(facility => facility.facilityId)
        .filter((facilityId): facilityId is string => facilityId !== undefined)
    : []
