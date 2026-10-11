import { useMemo } from 'react'
import { countEmptySeats } from '../utils/count-empty-seats'
import { filterTeamSeats } from '../utils/filter-team-seats'
import { countOccupiedSeats } from '@/utils/seat-occupancy'
import type { Employee, Seat, TeamOverlayPayload } from '@/types'

// 開いているチームの座席と、その在席数・空席数。ヘッダーの人数・座席グリッド・チーム削除の確認が
// 同じこの1本を見る

type UseTeamSeatsResult = {
  teamSeats: Seat[]
  occupiedCount: number
  emptySeatCount: number
}

export const useTeamSeats = (
  seats: Seat[],
  payload: TeamOverlayPayload | null,
  employeeById: Map<string, Employee>
): UseTeamSeatsResult => {
  const teamSeats = useMemo(() => filterTeamSeats(seats, payload), [seats, payload])
  // 判定基準は utils/seat-occupancy.ts に一本化(存在しない社員IDを参照する座席まで
  // 数えてしまい、空席なのに N名と出る不整合を防ぐ)
  const occupiedCount = useMemo(
    () => countOccupiedSeats(teamSeats, employeeById),
    [teamSeats, employeeById]
  )

  return { teamSeats, occupiedCount, emptySeatCount: countEmptySeats(teamSeats, occupiedCount) }
}
