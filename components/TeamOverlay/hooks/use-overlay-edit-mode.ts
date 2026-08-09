import { useCallback, useMemo, useState } from 'react'
import { useSeatDraftState } from './use-seat-draft-state'
import type { SeatDraftState } from './use-seat-draft-state'
import {
  addCol,
  addRow,
  buildSeatGridDraft,
  clearSeat,
  createInitialGrid,
  moveSeat,
  placeSeat,
  removeCol,
  removeRow,
} from '@/utils/layout/seat-grid-draft'
import type { GridCell, SeatGridDraft } from '@/utils/layout/seat-grid-draft'
import { RELAYOUT_PADDING } from '@/utils/layout/seat-relayout'
import type { Rect } from '@/utils/layout/rect'
import type { Seat } from '@/types'

// STEP A3: 座席編集モードの出入口。入口(enterEditMode)と出口(cancel)をこのフック1本に集約する
//
// grid は enterEditMode 呼び出し時に buildSeatGridDraft を1回だけ走らせて作る。以降のグリッド操作は
// 全て「今持っている grid」に対する差分適用で、毎レンダーで作り直すことはしない
// (作り直すと編集中に足した行・列が消える)
//
// 割当・追加・削除・回転の下書き(draft)は use-seat-draft-state にそのまま委譲する。
// 二重に状態を持たないよう、この1インスタンスを唯一の draft ソースとして返す

// 2つのグリッドが同じ内容か。行・列の本数と各セルの中身(席id/空)が全て一致すれば同じとみなす。
// 保存要否の判定にしか使わないためこのフックの内部に閉じる
const isSameSeatGridDraft = (a: SeatGridDraft, b: SeatGridDraft): boolean => {
  if (a.originX !== b.originX || a.originY !== b.originY) return false
  if (a.colPitch !== b.colPitch || a.rowPitch !== b.rowPitch) return false
  if (a.cells.length !== b.cells.length) return false
  return a.cells.every((row, r) => {
    const other = b.cells[r]
    return row.length === other.length && row.every((cell, c) => cell === other[c])
  })
}

export type UseOverlayEditModeResult = {
  isEditMode: boolean
  grid: SeatGridDraft | null
  // 編集開始時のグリッドから中身が変わったか。行・列の増減と席の移動・グリッドからの除去は
  // gridにしか現れずdraft.changeCountには一切載らないため、保存要否はこの値と併せて判定する
  isGridChanged: boolean
  // 編集開始。座標から grid を1回だけ起こす。席0件なら teamRect 左上+パディングへ1×1を作る
  enterEditMode: (seats: Seat[], teamRect: Rect) => void
  // draft と grid を破棄して表示モードへ戻る。確認は挟まない(取消は意図が明確な操作)
  cancel: () => void
  addRow: (edge: 'top' | 'bottom') => void
  addCol: (edge: 'left' | 'right') => void
  removeRow: (row: number) => void
  removeCol: (col: number) => void
  placeSeat: (cell: GridCell, seatId: string) => void
  // ゴミ箱ドロップの唯一の入口。gridのセルを空にすると同時にdraftへ削除を記録する。
  // 「席が消えた」の判定基準をgridとdraftの二重に作らないよう、呼び出し側は必ずこの1本を通す
  removeSeatAtCell: (cell: GridCell) => void
  moveSeat: (from: GridCell, to: GridCell) => void
  draft: SeatDraftState
}

export const useOverlayEditMode = (): UseOverlayEditModeResult => {
  const draft = useSeatDraftState()
  const [isEditMode, setIsEditMode] = useState(false)
  const [grid, setGrid] = useState<SeatGridDraft | null>(null)
  // 編集開始時のグリッドを取っておき、保存要否はこれとの差分だけで決める。
  // 変更回数を数える方式だと「足してから戻した」が変更ありになるため内容比較にする
  const [baselineGrid, setBaselineGrid] = useState<SeatGridDraft | null>(null)

  const enterEditMode = useCallback((seats: Seat[], teamRect: Rect) => {
    const initial =
      buildSeatGridDraft(seats) ??
      createInitialGrid(teamRect.x + RELAYOUT_PADDING, teamRect.y + RELAYOUT_PADDING)
    setGrid(initial)
    setBaselineGrid(initial)
    setIsEditMode(true)
  }, [])

  // draft(useSeatDraftStateの戻り値)は呼ばれるたびに新しいオブジェクトを返すため、depsを
  // [draft]のままにするとcancel自体も毎レンダー再生成されてしまう。ここで実際に使うのは
  // draft.clearDraftだけ(useSeatDraftState側でuseCallback([])により恒常的に安定)なので、
  // そこへ絞ってcancelの参照をレンダーをまたいで安定させる(指摘#11)
  const cancel = useCallback(() => {
    draft.clearDraft()
    setGrid(null)
    setBaselineGrid(null)
    setIsEditMode(false)
  }, [draft.clearDraft])

  // grid が無い(未編集)間は何もしない共通ガード。呼び出し側に null 分岐を作らせない
  const updateGrid = useCallback((update: (current: SeatGridDraft) => SeatGridDraft) => {
    setGrid((prev) => (prev ? update(prev) : prev))
  }, [])

  const handleAddRow = useCallback((edge: 'top' | 'bottom') => updateGrid((g) => addRow(g, edge)), [updateGrid])
  const handleAddCol = useCallback((edge: 'left' | 'right') => updateGrid((g) => addCol(g, edge)), [updateGrid])
  const handleRemoveRow = useCallback((row: number) => updateGrid((g) => removeRow(g, row)), [updateGrid])
  const handleRemoveCol = useCallback((col: number) => updateGrid((g) => removeCol(g, col)), [updateGrid])
  const handlePlaceSeat = useCallback(
    (cell: GridCell, seatId: string) => updateGrid((g) => placeSeat(g, cell, seatId)),
    [updateGrid]
  )
  // 削除対象の席id(下書き追加席なら仮id)をgridから先に読んでからセルを空にし、draftへも
  // 削除を記録する。下書き追加席の取り消しはuseSeatDraftState.removeSeat側で判定済みのため
  // ここでは分岐しない。depsをdraft全体ではなくdraft.removeSeatに絞る理由はcancelと同じ
  // (draftは毎レンダー新規オブジェクトだが、removeSeat自身の参照はaddedSeatsが実際に
  // 変わった時だけ動く。指摘#11)
  const removeSeatAtCell = useCallback(
    (cell: GridCell) => {
      const seatId = grid?.cells[cell.row]?.[cell.col] ?? null
      updateGrid((g) => clearSeat(g, cell))
      if (seatId) draft.removeSeat(seatId)
    },
    [grid, updateGrid, draft.removeSeat]
  )
  const handleMoveSeat = useCallback(
    (from: GridCell, to: GridCell) => updateGrid((g) => moveSeat(g, from, to)),
    [updateGrid]
  )

  // 指摘#11: 戻り値をuseMemoで安定化する。isEditMode/grid/baselineGridと各コールバックが
  // 変わらない限り同一オブジェクト参照を返し続けるため、これをdepsに置く呼び出し側の
  // identityも連鎖して安定する。ただしdraft自体はuseSeatDraftState側(このフックの担当外)が
  // 毎レンダー新規オブジェクトを返すため、draftを含むこのオブジェクトの参照は完全には
  // 安定しない。isEditMode/cancelなど個別フィールド単位では安定するため、参照の同一性が
  // 要る呼び出し側(use-overlay-edit-wiring.tsのguardedCloseなど)はフィールド単位でdepsに置く
  return useMemo<UseOverlayEditModeResult>(
    () => ({
      isEditMode,
      grid,
      isGridChanged: grid !== null && baselineGrid !== null && !isSameSeatGridDraft(grid, baselineGrid),
      enterEditMode,
      cancel,
      addRow: handleAddRow,
      addCol: handleAddCol,
      removeRow: handleRemoveRow,
      removeCol: handleRemoveCol,
      placeSeat: handlePlaceSeat,
      removeSeatAtCell,
      moveSeat: handleMoveSeat,
      draft,
    }),
    [
      isEditMode,
      grid,
      baselineGrid,
      enterEditMode,
      cancel,
      handleAddRow,
      handleAddCol,
      handleRemoveRow,
      handleRemoveCol,
      handlePlaceSeat,
      removeSeatAtCell,
      handleMoveSeat,
      draft,
    ]
  )
}
