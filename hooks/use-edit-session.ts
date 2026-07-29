import { useCallback, useMemo, useRef, useState } from 'react'
import { applyLayoutAction } from '@/utils/layout-actions'
import type { LayoutAction } from '@/utils/layout-actions'
import type { Seat, SeatLayout, Team } from '@/types'

// 07-admin-edit: 編集セッション(ワーキングコピー・undoスタック・変更数)。
// どのアクションを発行するかは呼び出し側(useLayoutEditor)が決める

// undo 用スナップショット(アクション適用直前の関連部分のみ保持)
type UndoEntry = { seats: Seat[]; teams: Team[] }

export type EditSession = {
  isEditMode: boolean
  editingLayout: SeatLayout | null
  changedCount: number
  canUndo: boolean
  enterEditMode: () => void
  finishEdit: () => void
  cancelEdit: () => void
  undo: () => void
  // 純粋リデューサーへディスパッチ(適用結果が無変化ならundo pushしない)
  dispatch: (action: LayoutAction, touchedIds: string[]) => void
}

export const useEditSession = (sourceLayout: SeatLayout | undefined): EditSession => {
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingLayout, setEditingLayout] = useState<SeatLayout | null>(null)
  const baselineRef = useRef<SeatLayout | null>(null)
  const undoStackRef = useRef<UndoEntry[]>([])
  const changedIdsRef = useRef<Set<string>>(new Set())
  const [undoVersion, setUndoVersion] = useState(0)
  const [changedVersion, setChangedVersion] = useState(0)

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

  // 変更を破棄してbaselineへ復元(完了もキャンセルも畳み方は同じ。保存は呼び出し側の責務)
  const restoreBaseline = useCallback(() => {
    baselineRef.current = null
    undoStackRef.current = []
    changedIdsRef.current = new Set()
    setEditingLayout(null)
    setIsEditMode(false)
    setUndoVersion((v) => v + 1)
    setChangedVersion((v) => v + 1)
  }, [])

  // 適用直前のスナップショットをpushし(無変化なら push しない)、変更エンティティ数を計上
  const pushUndoAndMarkChanged = useCallback((before: SeatLayout, touchedIds: string[]) => {
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
  }, [])

  const dispatch = useCallback(
    (action: LayoutAction, touchedIds: string[]) => {
      setEditingLayout((cur) => {
        if (!cur) return cur
        const next = applyLayoutAction(cur, action)
        if (next === cur) return cur
        pushUndoAndMarkChanged(cur, touchedIds)
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

  return {
    isEditMode,
    editingLayout,
    changedCount: useMemo(() => changedIdsRef.current.size, [changedVersion]),
    canUndo: useMemo(() => undoStackRef.current.length > 0, [undoVersion]),
    enterEditMode,
    finishEdit: restoreBaseline,
    cancelEdit: restoreBaseline,
    undo,
    dispatch,
  }
}
