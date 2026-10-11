import type { Seat, TeamOverlayPayload } from '@/types'

// オーバーレイで開いているチームの座席だけを取り出す。閉じている(payload が null)間は空
export const filterTeamSeats = (
  seats: Seat[],
  payload: Pick<TeamOverlayPayload, 'teamId'> | null
): Seat[] => (payload ? seats.filter(s => s.teamId === payload.teamId) : [])
