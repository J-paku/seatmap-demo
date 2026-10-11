import { useMemo } from 'react'
import { useTeamColorMap } from '@/hooks/use-team-color-map'
import { buildMinimapPayload } from '@/utils/minimap-payload'
import type { MinimapPayload } from '@/utils/minimap-payload'
import type { SeatLayout } from '@/types'

// 開いているチームのミニマップ用データ。オーバーレイが閉じている間(teamId が無い間)は組み立てない
export const useMinimapPayload = (
  layout: SeatLayout | undefined,
  currentTeamId: string | null
): MinimapPayload | null => {
  const colorMap = useTeamColorMap()
  return useMemo(
    () => (layout && currentTeamId ? buildMinimapPayload(layout, colorMap, currentTeamId) : null),
    [layout, colorMap, currentTeamId]
  )
}
