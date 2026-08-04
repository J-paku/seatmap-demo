import { useCallback } from 'react'
import { useEditSession } from './use-edit-session'
import { useErrorToast } from './use-error-toast'
import type { ErrorToastState } from './use-error-toast'
import { clampRectToViewBox } from '@/utils/rect'
import type { Rect } from '@/utils/rect'
import { findOverlappingSeat, findTeamContaining, seatOverlapsFixture, teamAreaOverlaps } from '@/utils/layout-rules'
import { fitAreaToSeats, relayoutSeatsInGrid } from '@/utils/seat-relayout'
import type { Seat, SeatLayout } from '@/types'

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
}

const seatsOfTeam = (seats: Seat[], teamId: string): Seat[] => seats.filter((s) => s.teamId === teamId)

const MSG_FACILITY = '設備と重なるため配置できません'
const MSG_TEAM_OVERLAP = 'チームエリアが重なるため適用できません'
const MSG_NOT_FIT = '座席が収まらないため適用できません'

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
  }
}
