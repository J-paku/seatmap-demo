import { useCallback } from 'react'
import type { UseOverlayEditModeResult } from './use-overlay-edit-mode'
import { resolveTeamRect } from '../utils/resolve-team-rect'
import type { MinimapArea, Seat } from '@/types'

// 編集セッションの始め方だけを持つ(畳み方は use-overlay-session-exit)。
// 見出しの鉛筆ボタンから呼ばれ、今のチームの座席からグリッドを起こして開始を告げる

type Params = {
  editMode: UseOverlayEditModeResult
  // 開いているチームの座席(保存済み)
  teamSeats: Seat[]
  // 席0件のチームへ1×1グリッドを起こすときの基準。渡されていなければ原点の空矩形になる
  minimapTeamArea: MinimapArea | null
  announce: (message: string) => void
}

export type UseOverlaySessionEnterResult = {
  handleEnterEdit: () => void
}

export const useOverlaySessionEnter = ({
  editMode,
  teamSeats,
  minimapTeamArea,
  announce,
}: Params): UseOverlaySessionEnterResult => {
  const teamRect = resolveTeamRect(minimapTeamArea)
  const handleEnterEdit = useCallback(() => {
    editMode.enterEditMode(teamSeats, teamRect)
    announce('[info]座席編集を開始しました')
  }, [editMode, teamSeats, teamRect, announce])

  return { handleEnterEdit }
}
