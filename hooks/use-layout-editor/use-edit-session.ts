import { useCallback, useRef, useState } from 'react'
import { applyLayoutAction } from '@/utils/layout/layout-actions'
import type { LayoutAction } from '@/utils/layout/layout-actions'
import { countLayoutChanges } from '@/utils/layout/layout-diff'
import type { SeatLayout } from '@/types'

// 07-admin-edit: 編集セッション(ワーキングコピー・undoスタック・変更数・保存中ロック)。
// どのアクションを発行するかは呼び出し側(useLayoutEditor)が決める

// undo 用スナップショット。フィールドを列挙せずレイアウト全体を持つ。
// 列挙すると編集対象の配列が増えたとき(facilities・furniture など)ここの追随を忘れ、
// undo チップは出るのに戻らない、という無言の失敗になる。別名にして型で追随させる。
// applyLayoutAction は常に新しいオブジェクトを返すので、適用前の参照はそのまま履歴として使える
type UndoEntry = SeatLayout

// undo スタックの上限。超えた分は古い方から捨てる
const UNDO_STACK_LIMIT = 10

// dispatch の結果種別。'noop'=レイアウト無変化 / 'staged'=ローカル反映済み /
// 'blocked'=保存中のため拒否。'blocked' を無言で捨てると操作が効いたように見えるので、
// 呼び出し側は必ず通知する
export type DispatchResult = 'noop' | 'staged' | 'blocked'

// undo の結果種別。'blocked'=保存中のため拒否 / 'empty'=スタックが無く何もしない /
// 'undone'=復元した。'blocked' を無言で捨てると、保存対象キャプチャ後にundoした結果が
// 保存成功と同時に消える無言の失敗になるため、呼び出し側は必ず通知する
type UndoResult = 'blocked' | 'empty' | 'undone'

export type EditSession = {
  isEditMode: boolean
  editingLayout: SeatLayout | null
  changedCount: number
  canUndo: boolean
  isSaving: boolean
  enterEditMode: () => void
  finishEdit: () => void
  cancelEdit: () => void
  undo: () => UndoResult
  beginSave: () => void
  endSave: () => void
  // 純粋リデューサーへディスパッチ(適用結果が無変化ならundo pushしない)
  dispatch: (action: LayoutAction) => DispatchResult
}

export const useEditSession = (sourceLayout: SeatLayout | undefined): EditSession => {
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingLayout, setEditingLayout] = useState<SeatLayout | null>(null)
  const baselineRef = useRef<SeatLayout | null>(null)
  const undoStackRef = useRef<UndoEntry[]>([])
  // 編集中レイアウトの最新値。dispatch が「適用前の状態」を setState の外で読むために持つ
  const editingLayoutRef = useRef<SeatLayout | null>(null)
  // ref から派生する数値はレンダー中に ref を読まずに済むよう state に持つ
  // (以前は version カウンタを回して useMemo の中で ref.current を読んでいた)
  const [changedCount, setChangedCount] = useState(0)
  const [canUndo, setCanUndo] = useState(false)
  // 保存中ロック。dispatch は同期的に読む必要があるので ref と state の両方へ置く
  const [isSaving, setIsSaving] = useState(false)
  const isSavingRef = useRef(false)

  // editingLayout は ref と state の両方へ同時に置く(ref=同期読み取り用・state=描画用)
  const commitEditingLayout = useCallback((next: SeatLayout | null) => {
    editingLayoutRef.current = next
    setEditingLayout(next)
  }, [])

  // 進入時処理(順序固定): baseline深いコピー保存→undoスタック初期化→編集モード表示。
  // 既に編集中なら何もしない — 二度目の呼び出しで baseline とスタックを作り直すと
  // 「編集開始時点」が失われ、変更件数も undo も編集途中を起点にしてしまう
  const enterEditMode = useCallback(() => {
    if (!sourceLayout || baselineRef.current) return
    const clone: SeatLayout = JSON.parse(JSON.stringify(sourceLayout))
    baselineRef.current = clone
    undoStackRef.current = []
    commitEditingLayout(JSON.parse(JSON.stringify(clone)))
    setIsEditMode(true)
    setChangedCount(0)
    setCanUndo(false)
  }, [sourceLayout, commitEditingLayout])

  // 変更を破棄してbaselineへ復元(完了もキャンセルも畳み方は同じ。保存は呼び出し側の責務)。
  // 保存中ロックもここで解く — 解かずに畳むと次に編集モードへ入った時、
  // 誰も endSave を呼ばないまま全ての操作が 'blocked' で弾かれ続ける
  const restoreBaseline = useCallback(() => {
    baselineRef.current = null
    undoStackRef.current = []
    isSavingRef.current = false
    commitEditingLayout(null)
    setIsEditMode(false)
    setChangedCount(0)
    setCanUndo(false)
    setIsSaving(false)
  }, [commitEditingLayout])

  const beginSave = useCallback(() => {
    isSavingRef.current = true
    setIsSaving(true)
  }, [])

  const endSave = useCallback(() => {
    isSavingRef.current = false
    setIsSaving(false)
  }, [])

  // 適用直前のスナップショットをpush(無変化なら呼ばない)。上限を超えた分は古い方から捨てる
  const pushUndo = useCallback((before: SeatLayout) => {
    const stack = undoStackRef.current
    stack.push(before)
    if (stack.length > UNDO_STACK_LIMIT) stack.splice(0, stack.length - UNDO_STACK_LIMIT)
    setCanUndo(true)
  }, [])

  // setEditingLayout の更新関数の中で undo スタックを積んでいたが、更新関数は純粋でなければならない
  // (StrictMode では二度呼ばれ、undo が重複して積まれる)。ref から現在値を読んで外で副作用を行う
  const dispatch = useCallback(
    (action: LayoutAction): DispatchResult => {
      // 保存中は編集を受け付けない。黙って捨てず種別で返し、呼び出し側に通知させる
      if (isSavingRef.current) return 'blocked'
      const baseline = baselineRef.current
      const cur = editingLayoutRef.current
      if (!baseline || !cur) return 'noop'
      const next = applyLayoutAction(cur, action)
      if (next === cur) return 'noop'
      pushUndo(cur)
      commitEditingLayout(next)
      // 件数は触ったidの累積ではなく baseline との差分で出す(チーム移動が所属座席の分まで膨らまない)
      setChangedCount(countLayoutChanges(baseline, next))
      return 'staged'
    },
    [pushUndo, commitEditingLayout]
  )

  const undo = useCallback((): UndoResult => {
    // dispatch と同じ保存中ロックの下に置く。ここを弾かないと、保存対象キャプチャ後の
    // 400msの間にundoした結果が保存成功と同時に消え、undoが効いたように見えて消える
    if (isSavingRef.current) return 'blocked'
    const entry = undoStackRef.current.pop()
    if (!entry) return 'empty'
    commitEditingLayout(entry)
    setCanUndo(undoStackRef.current.length > 0)
    // 差分から数えるので、戻した先のレイアウトで数え直す
    const baseline = baselineRef.current
    setChangedCount(baseline ? countLayoutChanges(baseline, entry) : 0)
    return 'undone'
  }, [commitEditingLayout])

  return {
    isEditMode,
    editingLayout,
    changedCount,
    canUndo,
    isSaving,
    enterEditMode,
    finishEdit: restoreBaseline,
    cancelEdit: restoreBaseline,
    undo,
    beginSave,
    endSave,
    dispatch,
  }
}
