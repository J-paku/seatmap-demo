import { OffscreenTeamIndicator } from './OffscreenTeamIndicator'
import type { UseOffscreenTeamIndicatorResult } from '../hooks/use-offscreen-team-indicator'
import { useTeamColorMap } from '@/hooks/use-team-color-map'
import { resolveTeamColor } from '@/utils/team-colors'

// 「最近傍チームへ移動」タグを出すかどうかと、そのチームの色の解決

type Props = {
  isEditMode: boolean
  offscreen: UseOffscreenTeamIndicatorResult
}

export const NearestTeamTag = ({ isEditMode, offscreen }: Props) => {
  const teamColorMap = useTeamColorMap()

  return (
    <>
      {/* 変換レイヤーの外(画面固定)。編集モードでは出さない — 編集オーバーレイと操作が衝突するため */}
      {!isEditMode && offscreen.nearestTeam && offscreen.pingPos && (
        <OffscreenTeamIndicator
          team={offscreen.nearestTeam}
          colorEntry={resolveTeamColor(
            teamColorMap,
            offscreen.nearestTeam.id,
            offscreen.nearestTeam.name
          )}
          pingPos={offscreen.pingPos}
          onGo={offscreen.goToNearestTeam}
        />
      )}
    </>
  )
}
