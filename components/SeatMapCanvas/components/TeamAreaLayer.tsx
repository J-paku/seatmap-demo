import { TeamArea } from '@/components/TeamArea'
import { resolveTeamColor } from '@/utils/team-colors'
import { useTeamColorMap } from '@/hooks/use-team-color-map'
import type { SeatLayout } from '@/types'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Lod, LivePosition } from '../type'

// チームアイランド層。閲覧モードの座標は team.area(サーバ絶対座標)をそのまま使う

type Props = {
  teams: SeatLayout['teams']
  assignedCountByTeam: Map<string, number>
  lod: Lod
  liveTeamPos: LivePosition | null
  isEditMode?: boolean
  onBoundaryOpen: (teamId: string, rect: DOMRect) => void
  onLabelEditPointerDown: (teamId: string, e: ReactPointerEvent) => void
  onLabelTap?: (teamId: string) => void
}

export const TeamAreaLayer = ({
  teams,
  assignedCountByTeam,
  lod,
  liveTeamPos,
  isEditMode,
  onBoundaryOpen,
  onLabelEditPointerDown,
  onLabelTap,
}: Props) => {
  const teamColorMap = useTeamColorMap()

  return (
    <>
      {teams.map((team) => (
        <TeamArea
          key={team.id}
          team={team}
          area={liveTeamPos && liveTeamPos.id === team.id ? { ...team.area, x: liveTeamPos.x, y: liveTeamPos.y } : team.area}
          colorEntry={resolveTeamColor(teamColorMap, team.id, team.name)}
          presentCount={assignedCountByTeam.get(team.id) ?? 0}
          lod={lod}
          dimmed={false}
          onBoundaryOpen={onBoundaryOpen}
          isEditMode={isEditMode}
          onLabelEditPointerDown={onLabelEditPointerDown}
          onLabelTap={onLabelTap}
        />
      ))}
    </>
  )
}
