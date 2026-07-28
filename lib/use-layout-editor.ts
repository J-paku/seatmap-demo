// 07-admin-edit: 編集モードの可変ワーキングコピー+undoスタック+アクション発行を司るフック
// 永続化(localStorage/サーバ保存)は本デモの実装範囲外(セッションメモリのみ・リロードで消滅)
import { useCallback, useMemo, useRef, useState } from 'react'
import type { Facility, Seat, SeatLayout, Team } from './types'
import type { LayoutAction, Rect } from './layout-actions'
import {
  DEFAULT_SEAT_HEIGHT,
  DEFAULT_SEAT_WIDTH,
  applyLayoutAction,
  clampRectToViewBox,
  fitAreaToSeats,
  rectOf,
  rectsIntersect,
  relayoutSeatsInGrid,
} from './layout-actions'

// undo 用スナップショット(アクション適用直前の関連部分のみ保持)
type UndoEntry = { seats: Seat[]; teams: Team[] }

// エラートースト用の一時文言
type ErrorToastState = { id: number; message: string } | null

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
  swapSeats: (fromSeatId: string, toSeatId: string) => void
  assignSeat: (seatId: string, teamId: string) => void
  deleteSeat: (seatId: string) => void
  moveTeam: (teamId: string, x: number, y: number) => void
  relayoutTeam: (teamId: string, rows: number, cols: number) => { ok: true } | { ok: false; message: string }
}

// 対象チームの所属座席id集合を先に取っておくための小ヘルパー
const seatsOfTeam = (seats: Seat[], teamId: string) => seats.filter((s) => s.teamId === teamId)

export const useLayoutEditor = (sourceLayout: SeatLayout | undefined): UseLayoutEditorApi => {
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingLayout, setEditingLayout] = useState<SeatLayout | null>(null)
  const baselineRef = useRef<SeatLayout | null>(null)
  const undoStackRef = useRef<UndoEntry[]>([])
  const changedIdsRef = useRef<Set<string>>(new Set())
  const [undoVersion, setUndoVersion] = useState(0)
  const [changedVersion, setChangedVersion] = useState(0)
  const [errorToast, setErrorToast] = useState<ErrorToastState>(null)
  const errorSeqRef = useRef(0)

  const showError = useCallback((message: string) => {
    errorSeqRef.current += 1
    setErrorToast({ id: errorSeqRef.current, message })
  }, [])

  const dismissError = useCallback(() => setErrorToast(null), [])

  // 進入時処理(順序固定): baseline深いコピー保存→undoスタック初期化→編集モード表示
  const enterEditMode = useCallback(() => {
    if (!sourceLayout) return
    const clone: SeatLayout = JSON.parse(JSON.stringify(sourceLayout))
    baselineRef.current = clone
    undoStackRef.current = []
    changedIdsRef.current = new Set()
    setEditingLayout(JSON.parse(JSON.stringify(clone)))
    setIsEditMode(true)
    setUndoVersion((v) => v + 1)
    setChangedVersion((v) => v + 1)
  }, [sourceLayout])

  // 変更を破棄してbaselineへ復元
  const restoreBaseline = useCallback(() => {
    baselineRef.current = null
    undoStackRef.current = []
    changedIdsRef.current = new Set()
    setEditingLayout(null)
    setIsEditMode(false)
    setUndoVersion((v) => v + 1)
    setChangedVersion((v) => v + 1)
  }, [])

  // 完了: 差分は本デモではセッション内に留め永続化しない(01/02 非範囲の指示に従う)
  const finishEdit = useCallback(() => {
    restoreBaseline()
  }, [restoreBaseline])

  const cancelEdit = useCallback(() => {
    restoreBaseline()
  }, [restoreBaseline])

  // 適用直前のスナップショットをpushし(無変化なら push しない)、変更エンティティ数を計上
  const pushUndoAndMarkChanged = useCallback(
    (before: SeatLayout, after: SeatLayout, touchedIds: string[]) => {
      if (before.seats === after.seats && before.teams === after.teams) return
      undoStackRef.current.push({ seats: before.seats, teams: before.teams })
      let changed = false
      for (const id of touchedIds) {
        if (!changedIdsRef.current.has(id)) {
          changedIdsRef.current.add(id)
          changed = true
        }
      }
      setUndoVersion((v) => v + 1)
      if (changed) setChangedVersion((v) => v + 1)
    },
    []
  )

  // 純粋リデューサーへディスパッチ(適用結果が無変化ならundo pushしない)
  const dispatch = useCallback(
    (action: LayoutAction, touchedIds: string[]) => {
      setEditingLayout((cur) => {
        if (!cur) return cur
        const next = applyLayoutAction(cur, action)
        if (next === cur) return cur
        pushUndoAndMarkChanged(cur, next, touchedIds)
        return next
      })
    },
    [pushUndoAndMarkChanged]
  )

  const undo = useCallback(() => {
    const entry = undoStackRef.current.pop()
    if (!entry) return
    setEditingLayout((cur) => (cur ? { ...cur, seats: entry.seats, teams: entry.teams } : cur))
    setUndoVersion((v) => v + 1)
  }, [])

  // ── 座席ドラッグ移動(スワップ/エリア内assign連鎖含む) ──────────

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
      const overlappedSeat = layout.seats.find(
        (s) => s.id !== seatId && rectsIntersect(rectOf(s), candidate)
      )
      if (overlappedSeat) {
        dispatch({ type: 'seat-swap', fromSeatId: seatId, toSeatId: overlappedSeat.id }, [seatId, overlappedSeat.id])
        return
      }

      // Facility と重なる場合は拒否(ドラッグ原位置へ復帰=何もしない)
      if (layout.facilities.some((f) => rectsIntersect(rectOf(f), candidate))) {
        showError('設備と重なるため配置できません')
        return
      }

      // 移動先が他チームのarea内部なら teamId を連鎖更新
      const centerX = candidate.x + candidate.w / 2
      const centerY = candidate.y + candidate.h / 2
      const targetTeam = layout.teams.find((t) => {
        if (t.id === seat.teamId) return false
        const a = t.area
        return centerX >= a.x && centerX <= a.x + a.w && centerY >= a.y && centerY <= a.y + a.h
      })

      dispatch({ type: 'seat-move', seatId, x: candidate.x, y: candidate.y }, [seatId])
      if (targetTeam) {
        dispatch({ type: 'seat-assign', seatId, teamId: targetTeam.id }, [seatId])
      }
    },
    [editingLayout, dispatch, showError]
  )

  const swapSeats = useCallback(
    (fromSeatId: string, toSeatId: string) => {
      dispatch({ type: 'seat-swap', fromSeatId, toSeatId }, [fromSeatId, toSeatId])
    },
    [dispatch]
  )

  const assignSeat = useCallback(
    (seatId: string, teamId: string) => {
      dispatch({ type: 'seat-assign', seatId, teamId }, [seatId])
    },
    [dispatch]
  )

  const deleteSeat = useCallback(
    (seatId: string) => {
      dispatch({ type: 'seat-delete', seatId }, [seatId])
    },
    [dispatch]
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

      // Team area同士の重なりを禁止
      const overlapsTeam = layout.teams.some(
        (t) => t.id !== teamId && rectsIntersect(rectOf({ ...t.area, width: t.area.w, height: t.area.h }), clamped)
      )
      if (overlapsTeam) {
        showError('チームエリアが重なるため適用できません')
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
      if (rows * cols < teamSeats.length) {
        return { ok: false, message: '座席が収まらないため適用できません' }
      }
      if (teamSeats.length === 0) {
        return { ok: false, message: '座席が収まらないため適用できません' }
      }
      const relaid = relayoutSeatsInGrid(teamSeats, team.area, rows, cols)
      const fitted = fitAreaToSeats(relaid, team.area)

      // fit後のareaが他area/Facilityと交差する場合は適用しない
      const overlapsTeam = layout.teams.some(
        (t) => t.id !== teamId && rectsIntersect(rectOf({ ...t.area, width: t.area.w, height: t.area.h }), fitted)
      )
      const overlapsFacility = layout.facilities.some((f) => rectsIntersect(rectOf(f), fitted))
      if (overlapsTeam) {
        return { ok: false, message: 'チームエリアが重なるため適用できません' }
      }
      if (overlapsFacility) {
        return { ok: false, message: '設備と重なるため配置できません' }
      }

      const touched = [teamId, ...teamSeats.map((s) => s.id)]
      dispatch({ type: 'team-relayout', teamId, rows, cols }, touched)
      return { ok: true }
    },
    [editingLayout, dispatch]
  )

  const changedCount = useMemo(() => changedIdsRef.current.size, [changedVersion])
  const canUndo = useMemo(() => undoStackRef.current.length > 0, [undoVersion])

  return {
    isEditMode,
    editingLayout,
    changedCount,
    canUndo,
    errorToast,
    enterEditMode,
    finishEdit,
    cancelEdit,
    undo,
    dismissError,
    moveSeat,
    swapSeats,
    assignSeat,
    deleteSeat,
    moveTeam,
    relayoutTeam,
  }
}

// SeatCard/TeamArea/FacilityBlock 共有の既定座席サイズ再エクスポート(edit UIから参照)
export { DEFAULT_SEAT_WIDTH, DEFAULT_SEAT_HEIGHT }
