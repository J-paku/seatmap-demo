import { useCallback, useMemo, useState } from 'react'
import type { UseOverlayEditModeResult } from './use-overlay-edit-mode'
import type { SeatGrid } from '../type'
import type { GridCell } from '@/utils/layout/seat-grid-draft'
import type { Employee, Seat } from '@/types'

// §06-2/§07-2: オーバーレイの座席削除だけを持つ。確認待ちの座席idをここに置いている間だけ
// 確認モーダルを描く。オーバーレイのセル削除は常に単席(§05-4のような複数選択は無い)なので
// 一括ケースは扱わない

// §06-2/§07-2: 座席削除確認の内容。DeleteConfirmDialog(components/edit/、担当外)をそのまま
// 再利用するため、渡す2値だけをここで解決する。employeeNameがnullなら空席1席ケース、
// 非nullなら在席1席ケースへその側で振り分けられる
export type SeatDeleteConfirmContent = {
  employeeName: string | null
  department: string | null
}

type Params = {
  editMode: UseOverlayEditModeResult
  seatGrid: SeatGrid
  // 下書き反映済みの全座席
  draftAppliedSeats: Seat[]
  employeeById: Map<string, Employee>
}

export type UseOverlaySeatDeleteResult = {
  // EditSeatCell の削除ボタン(aria-label='座席を削除')から Context 経由で呼ばれる
  requestSeatDelete: (seatId: string) => void
  // ゴミ箱投下(マウス/タッチ共通)はセルしか知らないための橋渡し
  requestSeatDeleteAtCell: (cell: GridCell) => void
  seatDeleteConfirm: SeatDeleteConfirmContent | null
  confirmSeatDelete: () => void
  cancelSeatDelete: () => void
}

export const useOverlaySeatDelete = ({
  editMode,
  seatGrid,
  draftAppliedSeats,
  employeeById,
}: Params): UseOverlaySeatDeleteResult => {
  const [deleteRequestSeatId, setDeleteRequestSeatId] = useState<string | null>(null)

  const requestSeatDelete = useCallback((seatId: string) => setDeleteRequestSeatId(seatId), [])

  // グリッドの生セル行列(editMode.grid.cells、use-overlay-edit-mode.ts の removeSeatAtCell 内部と
  // 同じ読み方)から座席idを解決してから requestSeatDelete へ合流させる。
  // 判定基準を二重に作らないよう、グリッド本体の唯一の読み出し口をここでもそのまま使う
  const requestSeatDeleteAtCell = useCallback(
    (cell: GridCell) => {
      const seatId = editMode.grid?.cells[cell.row]?.[cell.col] ?? null
      if (seatId) requestSeatDelete(seatId)
    },
    [editMode.grid, requestSeatDelete]
  )

  // §07-2: 表示用の氏名・部署。部署はEmployee.team(実物のディレクトリツリーのグルーピングに
  // 使う部署名文字列、types/index.ts参照)をそのまま使う — seat.teamIdは座席が今属している
  // チーム(=このオーバーレイ自身)であり、社員個人の部署とは別概念のため使わない
  const seatDeleteConfirm = useMemo<SeatDeleteConfirmContent | null>(() => {
    if (!deleteRequestSeatId) return null
    const seat = draftAppliedSeats.find((s) => s.id === deleteRequestSeatId)
    if (!seat) return null
    const employee = seat.employeeId ? employeeById.get(seat.employeeId) ?? null : null
    return { employeeName: employee ? employee.name : null, department: employee ? employee.team : null }
  }, [deleteRequestSeatId, draftAppliedSeats, employeeById])

  // §07-2 2段階削除: 在席1席は配属解除だけ(グリッドのセルはそのまま=形状不変)。
  // 空席1席はグリッドから席そのものを取り除く。セル位置は下書き反映済みの seatGrid から引く
  const confirmSeatDelete = useCallback(() => {
    if (!deleteRequestSeatId) return
    const seat = draftAppliedSeats.find((s) => s.id === deleteRequestSeatId)
    if (seat && seat.employeeId !== null) {
      editMode.draft.assignEmployee(deleteRequestSeatId, null)
    } else {
      const positioned = seatGrid.positionedSeats.find((p) => p.seat.id === deleteRequestSeatId)
      if (positioned) editMode.removeSeatAtCell({ row: positioned.row, col: positioned.col })
    }
    setDeleteRequestSeatId(null)
  }, [deleteRequestSeatId, draftAppliedSeats, editMode, seatGrid])

  const cancelSeatDelete = useCallback(() => setDeleteRequestSeatId(null), [])

  return {
    requestSeatDelete,
    requestSeatDeleteAtCell,
    seatDeleteConfirm,
    confirmSeatDelete,
    cancelSeatDelete,
  }
}
