import { TeamArea } from '@/components/TeamArea'
import { resolveTeamColor } from '@/utils/team-colors'
import { useTeamColorMap } from '@/hooks/use-team-color-map'
import type { SeatLayout } from '@/types'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Lod } from '../type'

// チームアイランド層。閲覧モードの座標は team.area(サーバ絶対座標)をそのまま使う

type Props = {
  teams: SeatLayout['teams']
  assignedCountByTeam: Map<string, number>
  lod: Lod
  isEditMode?: boolean
  onBoundaryOpen: (teamId: string, rect: DOMRect) => void
  onLabelEditPointerDown: (teamId: string, e: ReactPointerEvent) => void
  // 05-3: セッション中の枠タップ(移動ゴースト) / 05-1: 閲覧モードの長押し進入
  onEditTap: (teamId: string) => void
  onLongPressEditSession?: () => void
}

export const TeamAreaLayer = ({
  teams,
  assignedCountByTeam,
  lod,
  isEditMode,
  onBoundaryOpen,
  onLabelEditPointerDown,
  onEditTap,
  onLongPressEditSession,
}: Props) => {
  const teamColorMap = useTeamColorMap()

  return (
    <>
      {teams.map((team) => (
        <TeamArea
          key={team.id}
          team={team}
          area={team.area}
          colorEntry={resolveTeamColor(teamColorMap, team.id, team.name)}
          presentCount={assignedCountByTeam.get(team.id) ?? 0}
          lod={lod}
          dimmed={false}
          onBoundaryOpen={onBoundaryOpen}
          isEditMode={isEditMode}
          onLabelEditPointerDown={onLabelEditPointerDown}
          onEditTap={onEditTap}
          onLongPressEditSession={onLongPressEditSession}
        />
      ))}
    </>
  )
}
