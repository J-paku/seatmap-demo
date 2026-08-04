import { useCallback } from 'react'
import { useEditSession } from './use-edit-session'
import { applyLayoutAction } from '@/utils/layout-actions'
import { useErrorToast } from './use-error-toast'
import type { ErrorToastState } from './use-error-toast'
import { clampRectToViewBox } from '@/utils/rect'
import type { Rect } from '@/utils/rect'
import { findOverlappingSeat, findTeamContaining, placementBlocked, seatOverlapsFixture, teamAreaOverlaps } from '@/utils/layout-rules'
import { fitAreaToSeats, relayoutSeatsInGrid } from '@/utils/seat-relayout'
import { rectOfRef } from '@/utils/layout-objects'
import type { EditableObjectKind } from '@/utils/layout-actions'
import type { FurnitureKind, LayoutObjectRef, Seat, SeatLayout } from '@/types'

// 07-admin-edit: 編集アクションの発行口。セッション管理は useEditSession、
// 判定規則は utils/layout-rules が持ち、ここは「発行してよいか」を決めるだけ。
// 永続化(localStorage保存)は範囲外で、呼び出し側が finishEdit 直前に保存する

export type UseLayoutEditorApi = {
  isEditMode: boolean
  editingLayout: SeatLayout | null
  changedCount: number
  canUndo: boolean
  errorToast: ErrorToastState
  enterEditMode: () => void
  finishEdit: () => void
  cancelEdit: () => void
  undo: () => void
  dismissError: () => void
  moveSeat: (seatId: string, x: number, y: number) => void
  assignSeat: (seatId: string, teamId: string) => void
  deleteSeat: (seatId: string) => void
  moveTeam: (teamId: string, x: number, y: number) => void
  relayoutTeam: (teamId: string, rows: number, cols: number) => { ok: true } | { ok: false; message: string }
  addFurniture: (furnitureKind: FurnitureKind, rect: Rect) => boolean
  addFacility: (rect: Rect) => boolean
  moveObject: (ref: LayoutObjectRef, x: number, y: number) => void
  resizeObject: (ref: LayoutObjectRef, rect: Rect) => boolean
  deleteObject: (ref: LayoutObjectRef) => void
  addSeat: (teamId: string) => boolean
  assignEmployee: (seatId: string, employeeId: string | null) => void
}

const seatsOfTeam = (seats: Seat[], teamId: string): Seat[] => seats.filter((s) => s.teamId === teamId)

const MSG_FACILITY = '設備と重なるため配置できません'
const MSG_TEAM_OVERLAP = 'チームエリアが重なるため適用できません'
const MSG_NOT_FIT = '座席が収まらないため適用できません'
const MSG_OVERLAP = 'ここには配置できません'
const MSG_AREA_FULL = 'エリアが広がって他と重なるため追加できません'

export const useLayoutEditor = (sourceLayout: SeatLayout | undefined): UseLayoutEditorApi => {
  const session = useEditSession(sourceLayout)
  const { errorToast, showError, dismissError } = useErrorToast()
  const { editingLayout, dispatch } = session

  // 座席ドラッグ移動(スワップ/エリア内assign連鎖含む)
  const moveSeat = useCallback(
    (seatId: string, x: number, y: number) => {
      const layout = editingLayout
      if (!layout) return
      const seat = layout.seats.find((s) => s.id === seatId)
      if (!seat) return
      const candidate = clampRectToViewBox(
        { x, y, w: seat.width, h: seat.height },
        layout.viewBox.width,
        layout.viewBox.height
      )

      // ドロップ先が他座席と重なる場合はスワップとして解釈(座標は互いに維持)
      const overlapped = findOverlappingSeat(layout.seats, seatId, candidate)
      if (overlapped) {
        dispatch({ type: 'seat-swap', fromSeatId: seatId, toSeatId: overlapped.id }, [seatId, overlapped.id])
        return
      }
      // 会議室・家具と重なる場合は拒否(ドラッグ原位置へ復帰=何もしない)
      if (seatOverlapsFixture(layout, candidate)) {
        showError(MSG_FACILITY)
        return
      }

      dispatch({ type: 'seat-move', seatId, x: candidate.x, y: candidate.y }, [seatId])
      // 移動先が他チームのarea内部なら teamId を連鎖更新
      const targetTeam = findTeamContaining(layout.teams, seat.teamId, candidate)
      if (targetTeam) dispatch({ type: 'seat-assign', seatId, teamId: targetTeam.id }, [seatId])
    },
    [editingLayout, dispatch, showError]
  )

  // チームラベルドラッグ: area+所属全座席を同一delta平行移動(単一アクション=team-move)
  const moveTeam = useCallback(
    (teamId: string, x: number, y: number) => {
      const layout = editingLayout
      if (!layout) return
      const team = layout.teams.find((t) => t.id === teamId)
      if (!team) return
      const candidate: Rect = { x, y, w: team.area.w, h: team.area.h }
      const clamped = clampRectToViewBox(candidate, layout.viewBox.width, layout.viewBox.height)

      if (teamAreaOverlaps(layout.teams, teamId, clamped)) {
        showError(MSG_TEAM_OVERLAP)
        return
      }
      const touched = [teamId, ...seatsOfTeam(layout.seats, teamId).map((s) => s.id)]
      dispatch({ type: 'team-move', teamId, x: clamped.x, y: clamped.y }, touched)
    },
    [editingLayout, dispatch, showError]
  )

  // 行×列適用: グリッドリファク+area自動fit。座席数超過/衝突は拒否
  const relayoutTeam = useCallback(
    (teamId: string, rows: number, cols: number): { ok: true } | { ok: false; message: string } => {
      const layout = editingLayout
      if (!layout) return { ok: false, message: '編集対象がありません' }
      const team = layout.teams.find((t) => t.id === teamId)
      if (!team) return { ok: false, message: '対象チームが見つかりません' }
      const teamSeats = seatsOfTeam(layout.seats, teamId)
      if (teamSeats.length === 0 || rows * cols < teamSeats.length) {
        return { ok: false, message: MSG_NOT_FIT }
      }

      // fit後のareaが他area/Facilityと交差する場合は適用しない
      const fitted = fitAreaToSeats(relayoutSeatsInGrid(teamSeats, team.area, rows, cols), team.area)
      if (teamAreaOverlaps(layout.teams, teamId, fitted)) return { ok: false, message: MSG_TEAM_OVERLAP }
      if (seatOverlapsFixture(layout, fitted)) return { ok: false, message: MSG_FACILITY }

      dispatch({ type: 'team-relayout', teamId, rows, cols }, [teamId, ...teamSeats.map((s) => s.id)])
      return { ok: true }
    },
    [editingLayout, dispatch]
  )

  // 新規配置の共通ガード。ゴースト側の表示判定と同じ placementBlocked を通す。
  // ここで座標をクランプして押し込むと、ゴーストが指した場所と違う所へ静かに置かれるので、
  // はみ出しはクランプせず拒否する
  const guardPlacement = useCallback(
    (rect: Rect): Rect | null => {
      const layout = editingLayout
      if (!layout) return null
      if (placementBlocked(layout, null, rect)) {
        showError(MSG_OVERLAP)
        return null
      }
      return rect
    },
    [editingLayout, showError]
  )

  const addFurniture = useCallback(
    (furnitureKind: FurnitureKind, rect: Rect): boolean => {
      const placed = guardPlacement(rect)
      if (!placed) return false
      dispatch(
        { type: 'furniture-add', furnitureKind, x: placed.x, y: placed.y, width: placed.w, height: placed.h },
        [`furniture:${furnitureKind}:${placed.x}:${placed.y}`]
      )
      return true
    },
    [guardPlacement, dispatch]
  )

  const addFacility = useCallback(
    (rect: Rect): boolean => {
      const placed = guardPlacement(rect)
      if (!placed) return false
      dispatch(
        { type: 'facility-add', x: placed.x, y: placed.y, width: placed.w, height: placed.h },
        [`facility:${placed.x}:${placed.y}`]
      )
      return true
    },
    [guardPlacement, dispatch]
  )

  // 会議室・家具の移動。ゴースト配置と同じ placementBlocked を通し、自分自身だけ障害物から外す
  const moveObject = useCallback(
    (ref: LayoutObjectRef, x: number, y: number) => {
      const layout = editingLayout
      if (!layout) return
      const rect = rectOfRef(layout, ref)
      if (!rect) return
      const candidate: Rect = { x, y, w: rect.w, h: rect.h }
      if (placementBlocked(layout, ref, candidate)) {
        showError(MSG_OVERLAP)
        return
      }
      dispatch({ type: 'object-move', kind: ref.kind as EditableObjectKind, id: ref.id, x, y }, [ref.id])
    },
    [editingLayout, dispatch, showError]
  )

  const resizeObject = useCallback(
    (ref: LayoutObjectRef, rect: Rect): boolean => {
      const layout = editingLayout
      if (!layout) return false
      if (placementBlocked(layout, ref, rect)) {
        showError(MSG_OVERLAP)
        return false
      }
      dispatch(
        {
          type: 'object-resize',
          kind: ref.kind as EditableObjectKind,
          id: ref.id,
          x: rect.x,
          y: rect.y,
          width: rect.w,
          height: rect.h,
        },
        [ref.id]
      )
      return true
    },
    [editingLayout, dispatch, showError]
  )

  const deleteObject = useCallback(
    (ref: LayoutObjectRef) => {
      dispatch({ type: 'object-delete', kind: ref.kind as EditableObjectKind, id: ref.id }, [ref.id])
    },
    [dispatch]
  )

  // 座席の追加。エリアは座席群へ自動で広がるので、広げた結果が他と重なるときだけ拒否する。
  // 判定はリデューサーの結果に対して行う — 事前に手で予測すると計算が二重化する
  const addSeat = useCallback(
    (teamId: string): boolean => {
      const layout = editingLayout
      if (!layout) return false
      const next = applyLayoutAction(layout, { type: 'seat-add', teamId })
      if (next === layout) return false
      const team = next.teams.find((t) => t.id === teamId)
      if (!team) return false
      const area: Rect = { x: team.area.x, y: team.area.y, w: team.area.w, h: team.area.h }
      if (teamAreaOverlaps(next.teams, teamId, area) || seatOverlapsFixture(next, area)) {
        showError(MSG_AREA_FULL)
        return false
      }
      const added = next.seats.find((s) => !layout.seats.some((prev) => prev.id === s.id))
      dispatch({ type: 'seat-add', teamId }, [teamId, added?.id ?? teamId])
      return true
    },
    [editingLayout, dispatch, showError]
  )

  const assignEmployee = useCallback(
    (seatId: string, employeeId: string | null) => {
      dispatch({ type: 'seat-assign-employee', seatId, employeeId }, [seatId])
    },
    [dispatch]
  )

  return {
    isEditMode: session.isEditMode,
    editingLayout,
    changedCount: session.changedCount,
    canUndo: session.canUndo,
    errorToast,
    enterEditMode: session.enterEditMode,
    finishEdit: session.finishEdit,
    cancelEdit: session.cancelEdit,
    undo: session.undo,
    dismissError,
    moveSeat,
    assignSeat: useCallback(
      (seatId: string, teamId: string) => dispatch({ type: 'seat-assign', seatId, teamId }, [seatId]),
      [dispatch]
    ),
    deleteSeat: useCallback((seatId: string) => dispatch({ type: 'seat-delete', seatId }, [seatId]), [dispatch]),
    moveTeam,
    relayoutTeam,
    addFurniture,
    addFacility,
    moveObject,
    resizeObject,
    deleteObject,
    addSeat,
    assignEmployee,
  }
}
