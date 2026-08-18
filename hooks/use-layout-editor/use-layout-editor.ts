import { useCallback, useMemo } from 'react'
import { useEditSession } from './use-edit-session'
import type { DispatchResult } from './use-edit-session'
import type { LayoutAction, SeatShape } from '@/utils/layout/layout-actions'
import { useErrorToast } from './use-error-toast'
import type { ErrorToastState } from './use-error-toast'
import type { GaroonFacility } from '@/lib/garoon/facilities'
import type { Rect } from '@/utils/layout/rect'
import { findOverlappingSeat, findTeamContaining, lockedMessage, placementBlocked, seatOverlapsFixture } from '@/utils/layout/layout-rules'
import { rectOfRef } from '@/utils/layout/layout-objects'
import type { EditableObjectKind } from '@/utils/layout/layout-actions'
import type { FurnitureKind, LayoutObjectRef, Seat, SeatLayout, Team } from '@/types'

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
  // 05-4 の一括操作。3つとも選択中の座席をまとめて1アクションで扱う(undo 1回で戻る)
  rotateSeats: (seatIds: string[]) => void
  reshapeSeats: (seatIds: string[], shape: SeatShape) => void
  deleteSeats: (seatIds: string[]) => void
  // 移動ゴーストの確定に使うので成否を返す(拒まれたらゴーストを開いたままにする)
  moveTeam: (teamId: string, x: number, y: number) => boolean
  // §05-3/§07-3: タイプ確認モーダルを通った後のチーム削除。所属座席もリデューサー側で消える
  deleteTeam: (teamId: string) => void
  addFurniture: (furnitureKind: FurnitureKind, rect: Rect) => boolean
  // §03-3: Garoon マスタから選んだ1件を置く。省略時は未連携の会議室として採番する
  addFacility: (rect: Rect, facility?: GaroonFacility) => boolean
  moveObject: (ref: LayoutObjectRef, x: number, y: number) => void
  resizeObject: (ref: LayoutObjectRef, rect: Rect) => boolean
  deleteObject: (ref: LayoutObjectRef) => void
  // §05-3: 会議室・家具のロック/ラベル表示トグル
  setObjectLocked: (ref: LayoutObjectRef, locked: boolean) => void
  setObjectLabelVisible: (ref: LayoutObjectRef, labelVisible: boolean) => void
  addTeam: (name: string, color: string, rect: Rect) => boolean
  // §02-3 既存チーム取り込み。チームと複製座席を1アクションで積む(undo 1回で取り込み全体が戻る)。
  // 採番・ラベル重複回避・配置座標は utils/layout/team-import が決め終えた状態で渡ってくる
  importTeams: (teams: Team[], seats: Seat[]) => boolean
  assignEmployee: (seatId: string, employeeId: string | null) => void
}

const MSG_FACILITY = '設備と重なるため配置できません'
export const MSG_OVERLAP = 'ここには配置できません'
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
      const candidate: Rect = { x, y, w: seat.width, h: seat.height }

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

  // 05-4 の一括操作。空配列は発行しない — リデューサーが無変化を返すだけだが、
  // 「押したのに何も起きない」経路をここで閉じておく
  const rotateSeats = useCallback(
    (seatIds: string[]) => {
      if (seatIds.length === 0) return
      stage({ type: 'seat-rotate', seatIds })
    },
    [stage]
  )

  const reshapeSeats = useCallback(
    (seatIds: string[], shape: SeatShape) => {
      if (seatIds.length === 0) return
      stage({ type: 'seat-reshape', seatIds, shape })
    },
    [stage]
  )

  const deleteSeats = useCallback(
    (seatIds: string[]) => {
      if (seatIds.length === 0) return
      stage({ type: 'seat-delete-many', seatIds })
    },
    [stage]
  )

  // チームラベルドラッグ: area+所属全座席を同一delta平行移動(単一アクション=team-move)
  const moveTeam = useCallback(
    (teamId: string, x: number, y: number): boolean => {
      const layout = editingLayout
      if (!layout) return false
      const team = layout.teams.find((t) => t.id === teamId)
      if (!team) return false
      // §05-3: 入口(ゴースト)でも同じ判定を通しているが、発行口でも必ず見る。
      // 二重ガードにしないと、入口を増やしたときにロックを素通りする経路が生まれる
      const locked = lockedMessage(layout, { kind: 'team', id: teamId }, '移動')
      if (locked) {
        showError(locked)
        return false
      }
      const candidate: Rect = { x, y, w: team.area.w, h: team.area.h }

      // 置ける場所の判定はゴーストと同じ placementBlocked を通す(§04-4: チーム枠は4px内側
      // インセット + 会議室)。ここだけ teamAreaOverlaps(インセット無し・会議室を見ない)で
      // 判定していると、「ゴーストは置けると言うのに配置を押すと動かない」ズレが出る。
      // 実際に1Fの隣接チーム(枠が2px間隔で並ぶ)で再現した
      if (placementBlocked(layout, { kind: 'team', id: teamId }, candidate)) {
        showError(MSG_OVERLAP)
        return false
      }
      return stage({ type: 'team-move', teamId, x: candidate.x, y: candidate.y }) !== 'blocked'
    },
    [editingLayout, stage, showError]
  )

  // §07-3 のタイプ確認を通った後に呼ばれる。確認そのものは呼び出し側(ダイアログ)の担当
  const deleteTeam = useCallback(
    (teamId: string) => {
      const layout = editingLayout
      if (!layout) return
      const locked = lockedMessage(layout, { kind: 'team', id: teamId }, '削除')
      if (locked) {
        showError(locked)
        return
      }
      stage({ type: 'team-delete', teamId })
    },
    [editingLayout, stage, showError]
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
    (rect: Rect, facility?: GaroonFacility): boolean => {
      const placed = guardPlacement(rect)
      if (!placed) return false
      return (
        stage({
          type: 'facility-add',
          x: placed.x,
          y: placed.y,
          width: placed.w,
          height: placed.h,
          name: facility?.name,
          facilityId: facility?.facilityId,
        }) !== 'blocked'
      )
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
      const locked = lockedMessage(layout, ref, '移動')
      if (locked) {
        showError(locked)
        return
      }
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
      const locked = lockedMessage(layout, ref, '移動')
      if (locked) {
        showError(locked)
        return false
      }
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
      const layout = editingLayout
      const locked = layout ? lockedMessage(layout, ref, '削除') : null
      if (locked) {
        showError(locked)
        return
      }
      stage({ type: 'object-delete', kind: ref.kind as EditableObjectKind, id: ref.id })
    },
    [editingLayout, stage, showError]
  )

  // §05-3 のトグル2種。ロック中でもロック自体は外せる(外せないと解除する手段が無くなる)
  const setObjectLocked = useCallback(
    (ref: LayoutObjectRef, locked: boolean) => {
      stage({ type: 'object-lock', kind: ref.kind as EditableObjectKind, id: ref.id, locked })
    },
    [stage]
  )

  const setObjectLabelVisible = useCallback(
    (ref: LayoutObjectRef, labelVisible: boolean) => {
      stage({ type: 'object-label-visible', kind: ref.kind as EditableObjectKind, id: ref.id, labelVisible })
    },
    [stage]
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

  // 取り込みは guardPlacement を通さない。置ける場所が無いときに強制配置へ落ちるのが
  // §02-3 の回避3段の仕様で、ここで弾くと1階のように埋まったフロアでは取り込みが常に失敗する。
  // どの段で置いたか(置けなかったか)の通知は呼び出し側の担当
  const importTeams = useCallback(
    (teams: Team[], seats: Seat[]): boolean => {
      if (teams.length === 0) return false
      return stage({ type: 'team-import', teams, seats }) !== 'blocked'
    },
    [stage]
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
      rotateSeats,
      reshapeSeats,
      deleteSeats,
      moveTeam,
      deleteTeam,
      addFurniture,
      addFacility,
      moveObject,
      resizeObject,
      deleteObject,
      setObjectLocked,
      setObjectLabelVisible,
      addTeam,
      importTeams,
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
      rotateSeats,
      reshapeSeats,
      deleteSeats,
      moveTeam,
      deleteTeam,
      addFurniture,
      addFacility,
      moveObject,
      resizeObject,
      deleteObject,
      setObjectLocked,
      setObjectLabelVisible,
      addTeam,
      importTeams,
      assignEmployee,
    ]
  )
}
