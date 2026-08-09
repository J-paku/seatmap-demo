import { useCallback, useMemo, useState } from 'react'
import type { LayoutEditor } from '../type'
import type { Employee, Seat } from '@/types'

// 座席への配属。確認が要る場合と要らない場合の分岐と、結果文言の組み立てをここに閉じる。
//
// 経路は4通りあるが、リデューサー側は seat-assign-employee 1本で表現している。
// ここで決めるのは「確認を挟むか」と「何と読み上げるか」だけ

type AssignPlan = {
  seatId: string
  employeeId: string | null
  // 確認ダイアログの文面。null なら確認不要で即時
  confirmMessage: string | null
  // 完了時にライブリージョンとトーストへ流す文言(両方で同じものを使う)
  resultMessage: string
}

type SeatAssign = {
  assignSeatId: string | null
  assignTargetSeat: Seat | null
  pendingPlan: AssignPlan | null
  openAssign: (seatId: string) => void
  closeAssign: () => void
  requestAssign: (employeeId: string | null) => void
  confirmAssign: () => void
  cancelAssign: () => void
}

type Options = {
  editor: LayoutEditor
  employeeById: Map<string, Employee>
  onDone: (message: string) => void
}

const nameOf = (employeeById: Map<string, Employee>, id: string | null | undefined): string =>
  (id ? employeeById.get(id)?.name : undefined) ?? '担当者'

export const useSeatAssign = ({ editor, employeeById, onDone }: Options): SeatAssign => {
  const [assignSeatId, setAssignSeatId] = useState<string | null>(null)
  const [pendingPlan, setPendingPlan] = useState<AssignPlan | null>(null)
  const seats = editor.editingLayout?.seats

  const assignTargetSeat = useMemo(
    () => seats?.find((s) => s.id === assignSeatId) ?? null,
    [seats, assignSeatId]
  )

  const buildPlan = useCallback(
    (seatId: string, employeeId: string | null): AssignPlan | null => {
      const target = seats?.find((s) => s.id === seatId)
      if (!target) return null
      const displaced = target.employeeId
      const from = employeeId ? seats?.find((s) => s.employeeId === employeeId && s.id !== seatId) ?? null : null
      const person = nameOf(employeeById, employeeId)

      // 空席にする
      if (!employeeId) {
        return {
          seatId,
          employeeId: null,
          confirmMessage: displaced ? `${nameOf(employeeById, displaced)}さんの配属を解除しますか？` : null,
          resultMessage: `${seatId}を空席にしました`,
        }
      }
      // 他席に座っている社員 + 移動先も着席済み → 入れ替え
      if (from && displaced) {
        return {
          seatId,
          employeeId,
          confirmMessage: `${person}さん(${from.id})と${nameOf(employeeById, displaced)}さん(${seatId})を入れ替えますか？`,
          resultMessage: `${person}(${from.id})と${nameOf(employeeById, displaced)}(${seatId})を入れ替えました`,
        }
      }
      // 他席に座っている社員 → 移動
      if (from) {
        return {
          seatId,
          employeeId,
          confirmMessage: `${person}さんを${from.id}から${seatId}へ移動しますか？`,
          resultMessage: `${person}を${seatId}に配属しました`,
        }
      }
      // 着席済みの席へ配属 → 交替
      if (displaced) {
        return {
          seatId,
          employeeId,
          confirmMessage: `${seatId}の担当を${nameOf(employeeById, displaced)}さんから${person}さんへ交替しますか？`,
          resultMessage: `${seatId}の担当を${person}に交替しました`,
        }
      }
      // 空席 + 未配置の社員 → 確認なしで即時
      return { seatId, employeeId, confirmMessage: null, resultMessage: `${person}を${seatId}に配属しました` }
    },
    [seats, employeeById]
  )

  const apply = useCallback(
    (plan: AssignPlan) => {
      editor.assignEmployee(plan.seatId, plan.employeeId)
      onDone(plan.resultMessage)
    },
    [editor, onDone]
  )

  const requestAssign = useCallback(
    (employeeId: string | null) => {
      if (!assignSeatId) return
      const plan = buildPlan(assignSeatId, employeeId)
      if (!plan) return
      setAssignSeatId(null)
      if (plan.confirmMessage) setPendingPlan(plan)
      else apply(plan)
    },
    [assignSeatId, buildPlan, apply]
  )

  const openAssign = useCallback((seatId: string) => setAssignSeatId(seatId), [])
  const closeAssign = useCallback(() => setAssignSeatId(null), [])
  const confirmAssign = useCallback(() => {
    if (!pendingPlan) return
    apply(pendingPlan)
    setPendingPlan(null)
  }, [pendingPlan, apply])
  const cancelAssign = useCallback(() => setPendingPlan(null), [])

  return useMemo(
    () => ({
      assignSeatId,
      assignTargetSeat,
      pendingPlan,
      openAssign,
      closeAssign,
      requestAssign,
      confirmAssign,
      cancelAssign,
    }),
    [assignSeatId, assignTargetSeat, pendingPlan, openAssign, closeAssign, requestAssign, confirmAssign, cancelAssign]
  )
}
