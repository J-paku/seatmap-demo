import { useCallback, useMemo } from 'react'
import { useTeamColorMap } from '@/hooks/use-team-color-map'
import { buildTeamOverlayPayload } from '@/utils/team-overlay-payload'
import { clamp } from '@/utils/geometry'
import { rectOfRef } from '@/utils/layout-objects'
import type { LayoutObjectRef, SeatLayout } from '@/types'
import type { TeamOverlayPayload } from '@/components/TeamOverlay'
import { lodOf } from '../utils/canvas-metrics'
import type { Lod, Viewport } from '../type'

// 描画に必要な派生値とハンドラ。index.tsx を組み立てだけに保つために切り出す

type Options = {
  layout: SeatLayout
  viewport: Viewport
  isEditMode: boolean
  editSelectedSeatId: string | null
  editSelectedObject: LayoutObjectRef | null
  onSeatSelect?: (seatId: string) => void
  onTeamBoundaryClick?: (payload: TeamOverlayPayload) => void
}

type CanvasViewModel = {
  lod: Lod
  counterScale: number
  assignedCountByTeam: Map<string, number>
  seatActionBarPos: { x: number; y: number } | null
  objectActionBarPos: { x: number; y: number } | null
  handleSeatSelect: (seatId: string) => void
  handleTeamBoundaryOpen: (teamId: string, rect: DOMRect) => void
}

export const useCanvasViewModel = ({
  layout,
  viewport,
  isEditMode,
  editSelectedSeatId,
  editSelectedObject,
  onSeatSelect,
  onTeamBoundaryClick,
}: Options): CanvasViewModel => {
  const teamColorMap = useTeamColorMap()
  const { scaleSnap, transformSnap } = viewport

  // 11: チームラベルの N名 は「seat.teamId が一致し employeeId が非null」の件数
  const assignedCountByTeam = useMemo(() => {
    const map = new Map<string, number>()
    for (const team of layout.teams) {
      map.set(team.id, 0)
    }
    for (const seat of layout.seats) {
      if (seat.employeeId === null) continue
      if (!map.has(seat.teamId)) continue
      map.set(seat.teamId, (map.get(seat.teamId) ?? 0) + 1)
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

  // 選択中の会議室・家具のアクションバー画面座標(右下近傍)。座席と同じ出し方に揃える
  const objectActionBarPos = useMemo(() => {
    if (!isEditMode || !editSelectedObject) return null
    const rect = rectOfRef(layout, editSelectedObject)
    if (!rect) return null
    return {
      x: (rect.x + rect.w) * transformSnap.scale + transformSnap.translateX + 8,
      y: (rect.y + rect.h / 2) * transformSnap.scale + transformSnap.translateY,
    }
  }, [isEditMode, editSelectedObject, layout, transformSnap])

  return {
    lod: lodOf(scaleSnap),
    counterScale: useMemo(() => clamp(0.8 / scaleSnap, 1, 2), [scaleSnap]),
    assignedCountByTeam,
    seatActionBarPos,
    objectActionBarPos,
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
        const payload = buildTeamOverlayPayload(layout.teams, teamColorMap, teamId, rect)
        if (payload) onTeamBoundaryClick?.(payload)
      },
      [layout.teams, teamColorMap, onTeamBoundaryClick]
    ),
  }
}
