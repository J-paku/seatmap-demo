import { useMemo } from 'react'
import { useTeams } from '@/lib/mock-loader'
import { buildTeamColorRegistry } from '@/utils/team-colors'
import type { TeamColorEntry } from '@/utils/team-colors'

// SWR由来のTeamsから単一レジストリを構築するフック(全画面が参照する唯一の入口)
export const useTeamColorMap = (): Map<string, TeamColorEntry> => {
  const { data: teams } = useTeams()
  return useMemo(() => buildTeamColorRegistry(teams ?? []), [teams])
}
