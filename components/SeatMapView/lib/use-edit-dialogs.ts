import { useCallback, useState } from 'react'
import type { LayoutEditor } from '../type'
import type { Employee, Seat, Team } from '@/lib/types'

// 07: 座席削除確認・チーム変更シート・チームレイアウトエディタの開閉と対象解決

type EditDialogs = {
  deleteConfirmSeatId: string | null
  deleteTargetEmployeeName: string | null
  teamChangeSeatId: string | null
  teamChangeTargetSeat: Seat | null
  relayoutTeamId: string | null
  relayoutTargetTeam: Team | null
  relayoutTargetSeatCount: number
  requestSeatDelete: (seatId: string) => void
  requestTeamChange: (seatId: string) => void
  requestRelayout: (teamId: string) => void
  closeDeleteConfirm: () => void
  closeTeamChange: () => void
  closeRelayout: () => void
}

export const useEditDialogs = (editor: LayoutEditor, employeeById: Map<string, Employee>): EditDialogs => {
  const [deleteConfirmSeatId, setDeleteConfirmSeatId] = useState<string | null>(null)
  const [teamChangeSeatId, setTeamChangeSeatId] = useState<string | null>(null)
  const [relayoutTeamId, setRelayoutTeamId] = useState<string | null>(null)

  // 着席中は確認ダイアログを経由し、空席は即時削除(seat-delete発行)
  const requestSeatDelete = useCallback(
    (seatId: string) => {
      const seat = editor.editingLayout?.seats.find((s) => s.id === seatId)
      if (seat?.employeeId) setDeleteConfirmSeatId(seatId)
      else editor.deleteSeat(seatId)
    },
    [editor]
  )

  const deleteTargetSeat = editor.editingLayout?.seats.find((s) => s.id === deleteConfirmSeatId) ?? null

  return {
    deleteConfirmSeatId,
    deleteTargetEmployeeName: deleteTargetSeat?.employeeId
      ? employeeById.get(deleteTargetSeat.employeeId)?.name ?? null
      : null,
    teamChangeSeatId,
    teamChangeTargetSeat: editor.editingLayout?.seats.find((s) => s.id === teamChangeSeatId) ?? null,
    relayoutTeamId,
    relayoutTargetTeam: editor.editingLayout?.teams.find((t) => t.id === relayoutTeamId) ?? null,
    relayoutTargetSeatCount: relayoutTeamId
      ? editor.editingLayout?.seats.filter((s) => s.teamId === relayoutTeamId).length ?? 0
      : 0,
    requestSeatDelete,
    requestTeamChange: useCallback((seatId: string) => setTeamChangeSeatId(seatId), []),
    requestRelayout: useCallback((teamId: string) => setRelayoutTeamId(teamId), []),
    closeDeleteConfirm: useCallback(() => setDeleteConfirmSeatId(null), []),
    closeTeamChange: useCallback(() => setTeamChangeSeatId(null), []),
    closeRelayout: useCallback(() => setRelayoutTeamId(null), []),
  }
}
