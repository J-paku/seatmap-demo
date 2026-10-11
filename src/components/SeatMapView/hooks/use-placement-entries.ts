import { useCallback } from 'react'
import type { ObjectPlacement } from './use-object-placement'
import type { SeatMapTours } from './use-seat-map-tours'

// 配置フローの入口(キャンバスのチーム枠タップと、左下 FAB の「チーム」「設備」)

export type PlacementEntries = {
  handleTeamTap: (teamId: string) => void
  handleSelectTeam: () => void
  handleSelectFacility: () => void
}

export const usePlacementEntries = (
  placement: ObjectPlacement,
  tours: SeatMapTours
): PlacementEntries => {
  // 05-3: セッション中のチーム枠タップ = 移動ゴースト。実体はその場に残り、「配置」で初めて動く
  // (locked / fixedLayout のチームは startReposition が理由つきで弾く)
  const handleTeamTap = useCallback(
    (teamId: string) => placement.startReposition({ kind: 'team', id: teamId }),
    [placement.startReposition]
  )

  // FAB の「チーム」「設備」。未読ならその導線のガイドを先に予約してから配置フローを開く
  const handleSelectTeam = useCallback(() => {
    tours.beginTeamFlow()
    placement.selectCategory('team')
  }, [tours.beginTeamFlow, placement.selectCategory])
  const handleSelectFacility = useCallback(() => {
    tours.beginFacilityFlow()
    placement.openCategory()
  }, [tours.beginFacilityFlow, placement.openCategory])

  return { handleTeamTap, handleSelectTeam, handleSelectFacility }
}
