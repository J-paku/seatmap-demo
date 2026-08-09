import { useCallback, useMemo, useState } from 'react'
import type { LayoutEditor } from '../type'
import type { Employee, Facility, LayoutObjectRef, Seat, Team } from '@/types'

// 07: 座席削除確認・チーム変更シート・チームレイアウトエディタの開閉と対象解決

type EditDialogs = {
  deleteConfirmSeatId: string | null
  deleteTargetEmployeeName: string | null
  teamChangeSeatId: string | null
  teamChangeTargetSeat: Seat | null
  teamActionTeamId: string | null
  teamActionTeam: Team | null
  teamActionSeatCount: number
  relayoutTeamId: string | null
  relayoutTargetTeam: Team | null
  relayoutTargetSeatCount: number
  deleteObjectTarget: Facility | null
  requestSeatDelete: (seatId: string) => void
  // 会議室は確認を挟み、家具は即時削除する。呼び出し側は結果だけ受け取る
  requestObjectDelete: (ref: LayoutObjectRef) => void
  confirmObjectDelete: () => void
  closeObjectDelete: () => void
  requestTeamChange: (seatId: string) => void
  requestTeamAction: (teamId: string) => void
  chooseTeamAction: (action: 'add-seat' | 'relayout') => void
  closeTeamAction: () => void
  closeDeleteConfirm: () => void
  closeTeamChange: () => void
  closeRelayout: () => void
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
  const [relayoutTeamId, setRelayoutTeamId] = useState<string | null>(null)
  const [deleteObjectId, setDeleteObjectId] = useState<string | null>(null)
  const [teamActionTeamId, setTeamActionTeamId] = useState<string | null>(null)

  // 着席中は確認ダイアログを経由し、空席は即時削除(seat-delete発行)
  const requestSeatDelete = useCallback(
    (seatId: string) => {
      const seat = editor.editingLayout?.seats.find((s) => s.id === seatId)
      if (seat?.employeeId) setDeleteConfirmSeatId(seatId)
      else editor.deleteSeat(seatId)
    },
    [editor]
  )

  // 家具は名前も持たず誤操作の被害が小さいので即時削除。会議室は名前つきで確認する
  const requestObjectDelete = useCallback(
    (ref: LayoutObjectRef) => {
      if (ref.kind === 'facility') setDeleteObjectId(ref.id)
      else onDeleteObject(ref)
    },
    [onDeleteObject]
  )

  const confirmObjectDelete = useCallback(() => {
    if (!deleteObjectId) return
    onDeleteObject({ kind: 'facility', id: deleteObjectId })
    setDeleteObjectId(null)
  }, [deleteObjectId, onDeleteObject])

  // チームラベルのタップは操作選択を挟む。座席追加と再配置の両方をここから開く
  const chooseTeamAction = useCallback(
    (action: 'add-seat' | 'relayout') => {
      const teamId = teamActionTeamId
      if (!teamId) return
      setTeamActionTeamId(null)
      if (action === 'add-seat') editor.addSeat(teamId)
      else setRelayoutTeamId(teamId)
    },
    [teamActionTeamId, editor]
  )

  const deleteTargetSeat = editor.editingLayout?.seats.find((s) => s.id === deleteConfirmSeatId) ?? null

  const closeObjectDelete = useCallback(() => setDeleteObjectId(null), [])
  const requestTeamChange = useCallback((seatId: string) => setTeamChangeSeatId(seatId), [])
  const requestTeamAction = useCallback((teamId: string) => setTeamActionTeamId(teamId), [])
  const closeTeamAction = useCallback(() => setTeamActionTeamId(null), [])
  const closeDeleteConfirm = useCallback(() => setDeleteConfirmSeatId(null), [])
  const closeTeamChange = useCallback(() => setTeamChangeSeatId(null), [])
  const closeRelayout = useCallback(() => setRelayoutTeamId(null), [])

  return useMemo(
    () => ({
      deleteConfirmSeatId,
      deleteTargetEmployeeName: deleteTargetSeat?.employeeId
        ? employeeById.get(deleteTargetSeat.employeeId)?.name ?? null
        : null,
      teamChangeSeatId,
      teamChangeTargetSeat: editor.editingLayout?.seats.find((s) => s.id === teamChangeSeatId) ?? null,
      teamActionTeamId,
      teamActionTeam: editor.editingLayout?.teams.find((t) => t.id === teamActionTeamId) ?? null,
      teamActionSeatCount: teamActionTeamId
        ? editor.editingLayout?.seats.filter((s) => s.teamId === teamActionTeamId).length ?? 0
        : 0,
      relayoutTeamId,
      relayoutTargetTeam: editor.editingLayout?.teams.find((t) => t.id === relayoutTeamId) ?? null,
      relayoutTargetSeatCount: relayoutTeamId
        ? editor.editingLayout?.seats.filter((s) => s.teamId === relayoutTeamId).length ?? 0
        : 0,
      deleteObjectTarget: editor.editingLayout?.facilities.find((f) => f.id === deleteObjectId) ?? null,
      requestSeatDelete,
      requestObjectDelete,
      confirmObjectDelete,
      closeObjectDelete,
      requestTeamChange,
      requestTeamAction,
      chooseTeamAction,
      closeTeamAction,
      closeDeleteConfirm,
      closeTeamChange,
      closeRelayout,
    }),
    [
      deleteConfirmSeatId,
      deleteTargetSeat,
      employeeById,
      teamChangeSeatId,
      teamActionTeamId,
      relayoutTeamId,
      deleteObjectId,
      editor.editingLayout,
      requestSeatDelete,
      requestObjectDelete,
      confirmObjectDelete,
      closeObjectDelete,
      requestTeamChange,
      requestTeamAction,
      chooseTeamAction,
      closeTeamAction,
      closeDeleteConfirm,
      closeTeamChange,
      closeRelayout,
    ]
  )
}
