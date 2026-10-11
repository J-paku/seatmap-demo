import type { Seat } from '@/types'

// チーム削除の確認文言に出す空席数。在席数の判定は utils/seat-occupancy.ts の1本に任せ、ここは引くだけ
export const countEmptySeats = (teamSeats: Seat[], occupiedCount: number): number =>
  teamSeats.length - occupiedCount
