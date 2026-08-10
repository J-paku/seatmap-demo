import { useCallback, useMemo } from 'react'
import { useEditSession } from './use-edit-session'
import type { DispatchResult } from './use-edit-session'
import { applyLayoutAction } from '@/utils/layout/layout-actions'
import type { LayoutAction } from '@/utils/layout/layout-actions'
import { useErrorToast } from './use-error-toast'
import type { ErrorToastState } from './use-error-toast'
import { clampRectToViewBox } from '@/utils/layout/rect'
import type { Rect } from '@/utils/layout/rect'
import { findOverlappingSeat, findTeamContaining, placementBlocked, seatOverlapsFixture, teamAreaOverlaps } from '@/utils/layout/layout-rules'
import { fitAreaToSeats, relayoutSeatsInGrid } from '@/utils/layout/seat-relayout'
import { rectOfRef } from '@/utils/layout/layout-objects'
import type { EditableObjectKind } from '@/utils/layout/layout-actions'
import type { FurnitureKind, LayoutObjectRef, Seat, SeatLayout } from '@/types'

// 07-admin-edit: 編集アクションの発行口。セッション管理は useEditSession、
// 判定規則は utils/layout/layout-rules が持ち、ここは「発行してよいか」を決めるだけ。
// 永続化(localStorage保存)は範囲外で、呼び出し側が finishEdit 直前に保存する

export type UseLayoutEditorApi = {
  isEditMode: boolean
  editingLayout: SeatLayout | null
  changedCount: number
  canUndo: boolean
  isSaving: boolean
  errorToast: ErrorToastState
  enterEditMode: () => void
  finishEdit: () => void
  cancelEdit: () => void
  undo: () => void
  beginSave: () => void
  endSave: () => void
  dismissError: () => void
  // 保存の失敗も編集モードのエラー通知面(EditErrorToast)へ出す。
  // 保存側は編集セッションを畳まないので、通知先も編集モードのものを使う
  showError: (message: string) => void
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
  addTeam: (name: string, color: string, rect: Rect) => boolean
  addSeat: (teamId: string) => boolean
  assignEmployee: (seatId: string, employeeId: string | null) => void
}

const seatsOfTeam = (seats: Seat[], teamId: string): Seat[] => seats.filter((s) => s.teamId === teamId)

const MSG_FACILITY = '設備と重なるため配置できません'
const MSG_TEAM_OVERLAP = 'チームエリアが重なるため適用できません'
const MSG_NOT_FIT = '座席が収まらないため適用できません'
const MSG_OVERLAP = 'ここには配置できません'
const MSG_AREA_FULL = 'エリアが広がって他と重なるため追加できません'
const MSG_SAVING = '保存中は操作できません'

export const useLayoutEditor = (sourceLayout: SeatLayout | undefined): UseLayoutEditorApi => {
  // セッションは毎レンダー新しい入れ物を返すので、ここで中身へ分解して以降は個々の値だけを見る
  // (入れ物のまま持つと、後段の useMemo が毎レンダー作り直しになる)
  const {
    isEditMode,
    editingLayout,
    changedCount,
    canUndo,
    isSaving,
    enterEditMode,
    finishEdit,
    cancelEdit,
    undo: undoEdit,
    beginSave,
    endSave,
    dispatch,
  } = useEditSession(sourceLayout)
  const { errorToast, showError, dismissError } = useErrorToast()

  // 発行口を1本に束ねる。保存中は dispatch が 'blocked' を返すので、ここで必ず通知する
  // (無言で捨てると、ドラッグは戻るのに理由が出ず「操作は効いた」と誤解される)
  const stage = useCallback(
    (action: LayoutAction): DispatchResult => {
      const result = dispatch(action)
      if (result === 'blocked') showError(MSG_SAVING)
      return result
    },
    [dispatch, showError]
  )

  // undo も dispatch と同じ保存中ロックの対象。'blocked' は dispatch と同じ文言で通知し、
  // 'empty' はスタックが無いだけで異常ではないため通知しない
  const undo = useCallback(() => {
    if (undoEdit() === 'blocked') showError(MSG_SAVING)
  }, [undoEdit, showError])

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
        stage({ type: 'seat-swap', fromSeatId: seatId, toSeatId: overlapped.id })
        return
      }
      // 会議室・家具と重なる場合は拒否(ドラッグ原位置へ復帰=何もしない)
      if (seatOverlapsFixture(layout, candidate)) {
        showError(MSG_FACILITY)
        return
      }

      // 拒否されたら連鎖の所属更新も出さない(同じ理由で2回通知しない)
      if (stage({ type: 'seat-move', seatId, x: candidate.x, y: candidate.y }) === 'blocked') return
      // 移動先が他チームのarea内部なら teamId を連鎖更新
      const targetTeam = findTeamContaining(layout.teams, seat.teamId, candidate)
      if (targetTeam) stage({ type: 'seat-assign', seatId, teamId: targetTeam.id })
    },
    [editingLayout, stage, showError]
  )

  const assignSeat = useCallback(
    (seatId: string, teamId: string) => stage({ type: 'seat-assign', seatId, teamId }),
    [stage]
  )

  const deleteSeat = useCallback((seatId: string) => stage({ type: 'seat-delete', seatId }), [stage])

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
      stage({ type: 'team-move', teamId, x: clamped.x, y: clamped.y })
    },
    [editingLayout, stage, showError]
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
      const fitted = fitAreaToSeats(relayoutSeatsInGrid(teamSeats, team.area, cols), team.area)
      if (teamAreaOverlaps(layout.teams, teamId, fitted)) return { ok: false, message: MSG_TEAM_OVERLAP }
      if (seatOverlapsFixture(layout, fitted)) return { ok: false, message: MSG_FACILITY }

      // ここだけ stage を通さない。他の拒否理由と同じくモーダル内へ文言を返す
      // (モーダルの上にトーストを重ねると、暗幕の裏に隠れて読めない)
      if (dispatch({ type: 'team-relayout', teamId, rows, cols }) === 'blocked') {
        return { ok: false, message: MSG_SAVING }
      }
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
      return (
        stage({ type: 'furniture-add', furnitureKind, x: placed.x, y: placed.y, width: placed.w, height: placed.h }) !==
        'blocked'
      )
    },
    [guardPlacement, stage]
  )

  const addFacility = useCallback(
    (rect: Rect): boolean => {
      const placed = guardPlacement(rect)
      if (!placed) return false
      return stage({ type: 'facility-add', x: placed.x, y: placed.y, width: placed.w, height: placed.h }) !== 'blocked'
    },
    [guardPlacement, stage]
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
      stage({ type: 'object-move', kind: ref.kind as EditableObjectKind, id: ref.id, x, y })
    },
    [editingLayout, stage, showError]
  )

  const resizeObject = useCallback(
    (ref: LayoutObjectRef, rect: Rect): boolean => {
      const layout = editingLayout
      if (!layout) return false
      if (placementBlocked(layout, ref, rect)) {
        showError(MSG_OVERLAP)
        return false
      }
      return (
        stage({
          type: 'object-resize',
          kind: ref.kind as EditableObjectKind,
          id: ref.id,
          x: rect.x,
          y: rect.y,
          width: rect.w,
          height: rect.h,
        }) !== 'blocked'
      )
    },
    [editingLayout, stage, showError]
  )

  const deleteObject = useCallback(
    (ref: LayoutObjectRef) => {
      stage({ type: 'object-delete', kind: ref.kind as EditableObjectKind, id: ref.id })
    },
    [stage]
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
      return stage({ type: 'seat-add', teamId }) !== 'blocked'
    },
    [editingLayout, stage, showError]
  )

  const addTeam = useCallback(
    (name: string, color: string, rect: Rect): boolean => {
      const placed = guardPlacement(rect)
      if (!placed) return false
      return (
        stage({ type: 'team-add', name, color, x: placed.x, y: placed.y, width: placed.w, height: placed.h }) !==
        'blocked'
      )
    },
    [guardPlacement, stage]
  )

  const assignEmployee = useCallback(
    (seatId: string, employeeId: string | null) => {
      stage({ type: 'seat-assign-employee', seatId, employeeId })
    },
    [stage]
  )

  // 返り値そのものを参照安定にする。呼び出し側はこの入れ物を丸ごと依存配列へ入れるため、
  // 毎レンダー作り直すと下流の useCallback/memo が全て無効になる。
  // editingLayout は useEditSession の state で、編集操作(dispatch/undo/進入/終了)でしか
  // 差し替わらない — 閲覧モード中は null のまま動かないので、この入れ物も動かない
  return useMemo(
    () => ({
      isEditMode,
      editingLayout,
      changedCount,
      canUndo,
      isSaving,
      errorToast,
      enterEditMode,
      finishEdit,
      cancelEdit,
      undo,
      beginSave,
      endSave,
      dismissError,
      showError,
      moveSeat,
      assignSeat,
      deleteSeat,
      moveTeam,
      relayoutTeam,
      addFurniture,
      addFacility,
      moveObject,
      resizeObject,
      deleteObject,
      addTeam,
      addSeat,
      assignEmployee,
    }),
    [
      isEditMode,
      editingLayout,
      changedCount,
      canUndo,
      isSaving,
      errorToast,
      enterEditMode,
      finishEdit,
      cancelEdit,
      undo,
      beginSave,
      endSave,
      dismissError,
      showError,
      moveSeat,
      assignSeat,
      deleteSeat,
      moveTeam,
      relayoutTeam,
      addFurniture,
      addFacility,
      moveObject,
      resizeObject,
      deleteObject,
      addTeam,
      addSeat,
      assignEmployee,
    ]
  )
}
