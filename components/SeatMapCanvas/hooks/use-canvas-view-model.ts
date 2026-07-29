import { useCallback, useMemo } from 'react'
import { useTeamColorMap } from '@/hooks/use-team-color-map'
import { resolveTeamColor } from '@/utils/team-colors'
import { clamp } from '@/utils/geometry'
import type { Seat, SeatLayout } from '@/types'
import type { TeamOverlayPayload } from '@/components/TeamOverlay'
import { lodOf } from '../utils/canvas-metrics'
import type { Lod, Viewport } from '../type'

// 描画に必要な派生値とハンドラ。index.tsx を組み立てだけに保つために切り出す

type Options = {
  layout: SeatLayout
  viewport: Viewport
  isEditMode: boolean
  pulsingSeatId: string | null
  editSelectedSeatId: string | null
  onSeatSelect?: (seatId: string) => void
  onTeamBoundaryClick?: (payload: TeamOverlayPayload) => void
}

type CanvasViewModel = {
  lod: Lod
  counterScale: number
  pulsingSeat: Seat | null
  assignedCountByTeam: Map<string, number>
  seatActionBarPos: { x: number; y: number } | null
  handleSeatSelect: (seatId: string) => void
  handleTeamBoundaryOpen: (teamId: string, rect: DOMRect) => void
}

export const useCanvasViewModel = ({
  layout,
  viewport,
  isEditMode,
  pulsingSeatId,
  editSelectedSeatId,
  onSeatSelect,
  onTeamBoundaryClick,
}: Options): CanvasViewModel => {
  const teamColorMap = useTeamColorMap()
  const { scaleSnap, transformSnap } = viewport

  // 05: パルス中の座席(sr-only 化で個人カードが無いため、着地マーカーは座席の座標から直接描く)
  const pulsingSeat = useMemo(
    () => (pulsingSeatId ? layout.seats.find((s) => s.id === pulsingSeatId) ?? null : null),
    [pulsingSeatId, layout.seats]
  )

  // 11: チームラベルの N名 は「seat.id が team.idPrefix + '-' で始まり employeeId が非null」の件数
  const assignedCountByTeam = useMemo(() => {
    const map = new Map<string, number>()
    for (const team of layout.teams) {
      const prefix = `${team.idPrefix}-`
      map.set(team.id, layout.seats.filter((s) => s.id.startsWith(prefix) && s.employeeId !== null).length)
    }
    return map
  }, [layout.teams, layout.seats])

  // 07: 選択中座席のフローティングアクションバー画面座標(座席右下近傍)
  const seatActionBarPos = useMemo(() => {
    if (!isEditMode || !editSelectedSeatId) return null
    const seat = layout.seats.find((s) => s.id === editSelectedSeatId)
    if (!seat) return null
    return {
      x: (seat.x + seat.width) * transformSnap.scale + transformSnap.translateX + 8,
      y: (seat.y + seat.height / 2) * transformSnap.scale + transformSnap.translateY,
    }
  }, [isEditMode, editSelectedSeatId, layout.seats, transformSnap])

  return {
    lod: lodOf(scaleSnap),
    counterScale: useMemo(() => clamp(0.8 / scaleSnap, 1, 2), [scaleSnap]),
    pulsingSeat,
    assignedCountByTeam,
    seatActionBarPos,
    // 07: 編集モード中は座席タップで詳細パネルを開かず、アクションバーの選択のみ行う
    handleSeatSelect: useCallback(
      (seatId: string) => {
        if (isEditMode) return
        onSeatSelect?.(seatId)
      },
      [onSeatSelect, isEditMode]
    ),
    // 10: チームバウンダリのタップ→画面座標 rect + チーム色を親へ渡してオーバーレイを開く
    handleTeamBoundaryOpen: useCallback(
      (teamId: string, rect: DOMRect) => {
        const team = layout.teams.find((t) => t.id === teamId)
        if (!team) return
        const colorEntry = resolveTeamColor(teamColorMap, team.id, team.name)
        onTeamBoundaryClick?.({ teamId, teamName: team.name, teamColor: colorEntry.background, rect })
      },
      [layout.teams, teamColorMap, onTeamBoundaryClick]
    ),
  }
}
