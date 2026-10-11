import { hashStringToInt } from '@/utils/hash-string'

// 会議室×日付ごとに決まる擬似乱数の種。日付別の予約一覧(facility-meetings-for-date)と
// 予約一覧の生成の擬似遅延(FacilityDetail の compute-schedule-delay)が同じ組から同じ種を引く
export const facilityDaySeed = (dateKey: string, facilityId: string): number =>
  hashStringToInt(`${dateKey}#${facilityId}`)
