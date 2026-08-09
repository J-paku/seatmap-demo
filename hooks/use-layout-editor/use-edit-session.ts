import { useCallback, useRef, useState } from 'react'
import { applyLayoutAction } from '@/utils/layout/layout-actions'
import type { LayoutAction } from '@/utils/layout/layout-actions'
import type { SeatLayout } from '@/types'

// 07-admin-edit: 編集セッション(ワーキングコピー・undoスタック・変更数)。
// どのアクションを発行するかは呼び出し側(useLayoutEditor)が決める

// undo 用スナップショット。フィールドを列挙せずレイアウト全体を持つ。
// 列挙すると編集対象の配列が増えたとき(facilities・furniture など)ここの追随を忘れ、
// undo チップは出るのに戻らない、という無言の失敗になる。別名にして型で追随させる。
// applyLayoutAction は常に新しいオブジェクトを返すので、適用前の参照はそのまま履歴として使える
type UndoEntry = SeatLayout

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
  // 編集中レイアウトの最新値。dispatch が「適用前の状態」を setState の外で読むために持つ
  const editingLayoutRef = useRef<SeatLayout | null>(null)
  // ref から派生する数値はレンダー中に ref を読まずに済むよう state に持つ
  // (以前は version カウンタを回して useMemo の中で ref.current を読んでいた)
  const [changedCount, setChangedCount] = useState(0)
  const [canUndo, setCanUndo] = useState(false)

  // editingLayout は ref と state の両方へ同時に置く(ref=同期読み取り用・state=描画用)
  const commitEditingLayout = useCallback((next: SeatLayout | null) => {
    editingLayoutRef.current = next
    setEditingLayout(next)
  }, [])

  // 進入時処理(順序固定): baseline深いコピー保存→undoスタック初期化→編集モード表示
  const enterEditMode = useCallback(() => {
    if (!sourceLayout) return
    const clone: SeatLayout = JSON.parse(JSON.stringify(sourceLayout))
    baselineRef.current = clone
    undoStackRef.current = []
    changedIdsRef.current = new Set()
    commitEditingLayout(JSON.parse(JSON.stringify(clone)))
    setIsEditMode(true)
    setChangedCount(0)
    setCanUndo(false)
  }, [sourceLayout, commitEditingLayout])

  // 変更を破棄してbaselineへ復元(完了もキャンセルも畳み方は同じ。保存は呼び出し側の責務)
  const restoreBaseline = useCallback(() => {
    baselineRef.current = null
    undoStackRef.current = []
    changedIdsRef.current = new Set()
    commitEditingLayout(null)
    setIsEditMode(false)
    setChangedCount(0)
    setCanUndo(false)
  }, [commitEditingLayout])

  // 適用直前のスナップショットをpushし(無変化なら push しない)、変更エンティティ数を計上
  const pushUndoAndMarkChanged = useCallback((before: SeatLayout, touchedIds: string[]) => {
    undoStackRef.current.push(before)
    for (const id of touchedIds) changedIdsRef.current.add(id)
    setCanUndo(true)
    setChangedCount(changedIdsRef.current.size)
  }, [])

  // setEditingLayout の更新関数の中で undo スタックを積んでいたが、更新関数は純粋でなければならない
  // (StrictMode では二度呼ばれ、undo が重複して積まれる)。ref から現在値を読んで外で副作用を行う
  const dispatch = useCallback(
    (action: LayoutAction, touchedIds: string[]) => {
      const cur = editingLayoutRef.current
      if (!cur) return
      const next = applyLayoutAction(cur, action)
      if (next === cur) return
      pushUndoAndMarkChanged(cur, touchedIds)
      commitEditingLayout(next)
    },
    [pushUndoAndMarkChanged, commitEditingLayout]
  )

  const undo = useCallback(() => {
    const entry = undoStackRef.current.pop()
    if (!entry) return
    commitEditingLayout(entry)
    setCanUndo(undoStackRef.current.length > 0)
  }, [commitEditingLayout])

  return {
    isEditMode,
    editingLayout,
    changedCount,
    canUndo,
    enterEditMode,
    finishEdit: restoreBaseline,
    cancelEdit: restoreBaseline,
    undo,
    dispatch,
  }
}
