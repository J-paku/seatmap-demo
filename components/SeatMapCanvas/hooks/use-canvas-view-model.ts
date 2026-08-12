import { useCallback, useMemo } from 'react'
import { useTeamColorMap } from '@/hooks/use-team-color-map'
import { FURNITURE_KIND_LABEL } from '@/utils/furniture-catalog'
import { buildTeamOverlayPayload } from '@/utils/team-overlay-payload'
import { clamp } from '@/utils/layout/geometry'
import { rectOfRef } from '@/utils/layout/layout-objects'
import { countOccupiedSeatsByTeam } from '@/utils/seat-occupancy'
import type { Employee, LayoutObjectRef, SeatLayout, TeamOverlayPayload } from '@/types'
import { lodOf } from '../utils/canvas-metrics'
import type { Lod, Viewport } from '../type'

// 描画に必要な派生値とハンドラ。index.tsx を組み立てだけに保つために切り出す

type Options = {
  layout: SeatLayout
  employeeById: Map<string, Employee>
  viewport: Viewport
  isEditMode: boolean
  editSelectedObject: LayoutObjectRef | null
  onSeatSelect?: (seatId: string) => void
  onTeamBoundaryClick?: (payload: TeamOverlayPayload) => void
}

// 05-3: 属性バー(ObjectActionBar)が出す対象の現在値。選択が無いときは null
type SelectedObjectAttrs = {
  name: string
  locked: boolean
  labelVisible: boolean
  // 名前を持たない建設設備はラベル自体が無いのでトグルを出さない
  canToggleLabel: boolean
}

type CanvasViewModel = {
  lod: Lod
  counterScale: number
  assignedCountByTeam: Map<string, number>
  objectActionBarPos: { x: number; y: number } | null
  selectedObjectAttrs: SelectedObjectAttrs | null
  handleSeatSelect: (seatId: string) => void
  handleTeamBoundaryOpen: (teamId: string, rect: DOMRect) => void
}

export const useCanvasViewModel = ({
  layout,
  employeeById,
  viewport,
  isEditMode,
  editSelectedObject,
  onSeatSelect,
  onTeamBoundaryClick,
}: Options): CanvasViewModel => {
  const teamColorMap = useTeamColorMap()
  const { scaleSnap, transformSnap } = viewport

  // 11: チームラベルの N名 は「seat.teamId が一致し、employeeId が実在社員を指す」座席の件数。
  // 判定基準は utils/seat-occupancy.ts に一本化(存在しない社員IDを参照する座席まで
  // 数えてしまい、空席なのに N名と出る不整合を防ぐ)
  const assignedCountByTeam = useMemo(
    () => countOccupiedSeatsByTeam(layout.seats, employeeById, layout.teams),
    [layout.seats, employeeById, layout.teams]
  )

  // 選択中の会議室・家具のアクションバー画面座標(右下近傍)。
  // 座席側の同等品は持たない — 一括操作バー(SeatActionBar)は選択席の DOM へ自前で追従する
  const objectActionBarPos = useMemo(() => {
    if (!isEditMode || !editSelectedObject) return null
    const rect = rectOfRef(layout, editSelectedObject)
    if (!rect) return null
    return {
      x: (rect.x + rect.w) * transformSnap.scale + transformSnap.translateX + 8,
      y: (rect.y + rect.h / 2) * transformSnap.scale + transformSnap.translateY,
    }
  }, [isEditMode, editSelectedObject, layout, transformSnap])

  // 05-3: ロック・ラベル表示の現在値。判定材料はレイアウトの実体1つだけに保つ
  // (バー側へ Facility/Furniture をそのまま渡すと、表示のために型分岐がもう1つ増える)
  const selectedObjectAttrs = useMemo((): SelectedObjectAttrs | null => {
    if (!isEditMode || !editSelectedObject) return null
    if (editSelectedObject.kind === 'facility') {
      const facility = layout.facilities.find((f) => f.id === editSelectedObject.id)
      if (!facility) return null
      return {
        name: facility.name,
        locked: facility.locked === true,
        labelVisible: facility.labelVisible !== false,
        canToggleLabel: facility.name.length > 0,
      }
    }
    if (editSelectedObject.kind === 'furniture') {
      const item = layout.furniture.find((f) => f.id === editSelectedObject.id)
      if (!item) return null
      return {
        name: item.name || FURNITURE_KIND_LABEL[item.kind],
        locked: item.locked === true,
        labelVisible: item.labelVisible !== false,
        canToggleLabel: item.name.length > 0,
      }
    }
    return null
  }, [isEditMode, editSelectedObject, layout])

  return {
    lod: lodOf(scaleSnap),
    counterScale: useMemo(() => clamp(0.8 / scaleSnap, 1, 2), [scaleSnap]),
    assignedCountByTeam,
    objectActionBarPos,
    selectedObjectAttrs,
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
