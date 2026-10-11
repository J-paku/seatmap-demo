import { facilityDaySeed } from '@/utils/seed-facility-day'

// 生成の擬似遅延(仕様: 200〜500ms)
const DELAY_MIN_MS = 200
const DELAY_MAX_MS = 500
const DELAY_SPAN_MS = DELAY_MAX_MS - DELAY_MIN_MS

// dateKeyとfacilityIdから決定論的な遅延値(200〜500ms)を求める。Math.random()は使わない
export const deterministicDelay = (dateKey: string, facilityId: string): number => {
  const state = facilityDaySeed(dateKey, facilityId)
  return DELAY_MIN_MS + ((state >>> 0) % DELAY_SPAN_MS)
}
