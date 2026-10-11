import { useCallback, useMemo, useState } from 'react'
import type { LayoutEditor } from '../type'
import type { Employee, Facility, LayoutObjectRef, Seat, Team } from '@/types'
import { isOccupiedSeat } from '@/utils/seat-occupancy'

// 07: 座席削除確認・チーム変更シート・オブジェクト/チーム削除確認の開閉と対象解決

type EditDialogs = {
  deleteConfirmSeatId: string | null
  deleteTargetEmployeeName: string | null
  teamChangeSeatId: string | null
  teamChangeTargetSeat: Seat | null
  deleteObjectTarget: Facility | null
  // §07-3: チーム削除のタイプ確認。本文に出す席数は確認を開いた時点の編集中レイアウトから数える
  deleteTeamTarget: Team | null
  deleteTeamOccupiedCount: number
  deleteTeamEmptyCount: number
  requestSeatDelete: (seatId: string) => void
  // 会議室はダイアログ確認、チームはタイプ確認、家具は即時削除。呼び出し側は結果だけ受け取る
  requestObjectDelete: (ref: LayoutObjectRef) => void
  confirmObjectDelete: () => void
  closeObjectDelete: () => void
  confirmTeamDelete: () => void
  closeTeamDelete: () => void
  requestTeamChange: (seatId: string) => void
  closeDeleteConfirm: () => void
  closeTeamChange: () => void
}

type Options = {
  // 削除の実行そのものは呼び出し側が握る(「元に戻す」チップを同時に出すため)
  onDeleteObject: (ref: LayoutObjectRef) => void
}

export const useEditDialogs = (
  editor: LayoutEditor,
  employeeById: Map<string, Employee>,
  { onDeleteObject }: Options
): EditDialogs => {
  const [deleteConfirmSeatId, setDeleteConfirmSeatId] = useState<string | null>(null)
  const [teamChangeSeatId, setTeamChangeSeatId] = useState<string | null>(null)
  const [deleteObjectId, setDeleteObjectId] = useState<string | null>(null)
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null)

  // 着席中は確認ダイアログを経由し、空席は即時削除(seat-delete発行)
  const requestSeatDelete = useCallback(
    (seatId: string) => {
      const seat = editor.editingLayout?.seats.find((s) => s.id === seatId)
      if (seat && isOccupiedSeat(seat, employeeById)) setDeleteConfirmSeatId(seatId)
      else editor.deleteSeat(seatId)
    },
    [editor, employeeById]
  )

  // 家具は名前も持たず誤操作の被害が小さいので即時削除。会議室は名前つきで確認し、
  // チームは所属座席ごと消えるので §07-3 のタイプ確認(キーワード入力)を通す
  const requestObjectDelete = useCallback(
    (ref: LayoutObjectRef) => {
      if (ref.kind === 'facility') setDeleteObjectId(ref.id)
      else if (ref.kind === 'team') setDeleteTeamId(ref.id)
      else onDeleteObject(ref)
    },
    [onDeleteObject]
  )

  const confirmObjectDelete = useCallback(() => {
    if (!deleteObjectId) return
    onDeleteObject({ kind: 'facility', id: deleteObjectId })
    setDeleteObjectId(null)
  }, [deleteObjectId, onDeleteObject])

  const confirmTeamDelete = useCallback(() => {
    if (!deleteTeamId) return
    onDeleteObject({ kind: 'team', id: deleteTeamId })
    setDeleteTeamId(null)
  }, [deleteTeamId, onDeleteObject])

  const deleteTargetSeat = editor.editingLayout?.seats.find((s) => s.id === deleteConfirmSeatId) ?? null
  // §07-3 本文の「配置済み {occupied}席・空席 {empty}席」。着席判定は seat-occupancy に一本化する
  const deleteTeamSeats = deleteTeamId
    ? editor.editingLayout?.seats.filter((s) => s.teamId === deleteTeamId) ?? []
    : []
  const deleteTeamOccupiedCount = deleteTeamSeats.filter((s) => isOccupiedSeat(s, employeeById)).length

  const closeObjectDelete = useCallback(() => setDeleteObjectId(null), [])
  const closeTeamDelete = useCallback(() => setDeleteTeamId(null), [])
  const requestTeamChange = useCallback((seatId: string) => setTeamChangeSeatId(seatId), [])
  const closeDeleteConfirm = useCallback(() => setDeleteConfirmSeatId(null), [])
  const closeTeamChange = useCallback(() => setTeamChangeSeatId(null), [])

  return useMemo(
    () => ({
      deleteConfirmSeatId,
      deleteTargetEmployeeName: deleteTargetSeat?.employeeId
        ? employeeById.get(deleteTargetSeat.employeeId)?.name ?? null
        : null,
      teamChangeSeatId,
      teamChangeTargetSeat: editor.editingLayout?.seats.find((s) => s.id === teamChangeSeatId) ?? null,
      deleteObjectTarget: editor.editingLayout?.facilities.find((f) => f.id === deleteObjectId) ?? null,
      deleteTeamTarget: editor.editingLayout?.teams.find((t) => t.id === deleteTeamId) ?? null,
      deleteTeamOccupiedCount,
      deleteTeamEmptyCount: deleteTeamSeats.length - deleteTeamOccupiedCount,
      requestSeatDelete,
      requestObjectDelete,
      confirmObjectDelete,
      closeObjectDelete,
      confirmTeamDelete,
      closeTeamDelete,
      requestTeamChange,
      closeDeleteConfirm,
      closeTeamChange,
    }),
    [
      deleteConfirmSeatId,
      deleteTargetSeat,
      employeeById,
      teamChangeSeatId,
      deleteObjectId,
      deleteTeamId,
      deleteTeamSeats.length,
      deleteTeamOccupiedCount,
      editor.editingLayout,
      requestSeatDelete,
      requestObjectDelete,
      confirmObjectDelete,
      closeObjectDelete,
      confirmTeamDelete,
      closeTeamDelete,
      requestTeamChange,
      closeDeleteConfirm,
      closeTeamChange,
    ]
  )
}
