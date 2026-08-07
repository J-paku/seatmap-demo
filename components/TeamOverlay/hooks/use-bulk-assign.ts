import { useCallback, useState } from 'react'
import type { SeatDraftState } from './use-seat-draft-state'
import type { UseOverlayEditModeResult } from './use-overlay-edit-mode'
import { addRow as addGridRow, findFirstEmptyCell, placeSeat as placeSeatInGrid } from '@/utils/seat-grid-draft'
import type { SeatGridDraft } from '@/utils/seat-grid-draft'
import { DEFAULT_SEAT_HEIGHT, DEFAULT_SEAT_WIDTH } from '@/utils/seat-relayout'
import type { Employee, Seat } from '@/types'

// STEP C3: 部署ごとの一括配置。EmployeeAssignSheetの「この部署をまとめて配属」から呼ばれ、
// 対象席のチームに属する社員全員を、空セル(=席が1件も無いグリッド位置)へ行優先で新規座席
// として詰めていく。既に正しく着席している人まで巻き込んで席を作り直さないよう、対象は
// 「まだどこにも座っていない(newcomers)」か「他の座席に座っている(movers)」の社員だけに絞る。
// moversが1人でもいれば確認を挟み、確定後は元座席を空席化してmoveOriginsへ記録する

export type BulkAssignTarget = {
  employee: Employee
  // 他所の座席から移動してくる場合はその座席id。どこにも座っていなければnull(newcomer)
  originSeatId: string | null
}

export type BulkAssignPlan = {
  teamId: string
  targets: BulkAssignTarget[]
  moverCount: number
  // 確認ダイアログの文面。movers が1人もいなければnull(確認不要で即時実行)
  confirmMessage: string | null
}

export type UseBulkAssignResult = {
  pendingPlan: BulkAssignPlan | null
  // シートの「この部署をまとめて配属」の唯一の入口。対象0件、未編集(grid未確立)なら何もしない
  requestBulkAssign: () => void
  confirmBulkAssign: () => void
  cancelBulkAssign: () => void
}

type Options = {
  teamId: string | null
  employees: Employee[]
  // 全社員の現在の着席先を解決するための全座席(保存済みの生データ。下書き反映はdraft側で行う)
  seats: Seat[]
  grid: SeatGridDraft | null
  draft: SeatDraftState
  addRow: UseOverlayEditModeResult['addRow']
  placeSeat: UseOverlayEditModeResult['placeSeat']
}

// 社員が今座っている座席そのもの。下書き追加席はemployeeIdを直読みし、既存席は割当の唯一の
// 解決口(resolveEffectiveEmployeeId)を通す。削除済み座席は対象から外す
const findCurrentSeat = (employeeId: string, seats: Seat[], draft: SeatDraftState): Seat | null => {
  const added = draft.addedSeats.find((s) => s.employeeId === employeeId)
  if (added) return added
  const saved = seats.find(
    (s) => !draft.removedSeatIds.has(s.id) && draft.resolveEffectiveEmployeeId(s.id, s.employeeId) === employeeId
  )
  return saved ?? null
}

const buildPlan = (teamId: string, employees: Employee[], seats: Seat[], draft: SeatDraftState): BulkAssignPlan => {
  const targets: BulkAssignTarget[] = []
  for (const employee of employees.filter((e) => e.teamId === teamId)) {
    const currentSeat = findCurrentSeat(employee.id, seats, draft)
    // 既にこのチームの席に座っている人は対象から外す(触らずそのまま)。外さないと、
    // 部署が既に正しく着席済みでも全員が一旦空席化→新しい席へ作り直される無駄な入れ替えが起きる
    if (currentSeat && currentSeat.teamId === teamId) continue
    targets.push({ employee, originSeatId: currentSeat ? currentSeat.id : null })
  }
  const moverCount = targets.filter((t) => t.originSeatId !== null).length
  return {
    teamId,
    targets,
    moverCount,
    confirmMessage: moverCount > 0 ? `${moverCount}名を他の座席から移動します。よろしいですか？` : null,
  }
}

export const useBulkAssign = ({ teamId, employees, seats, grid, draft, addRow, placeSeat }: Options): UseBulkAssignResult => {
  const [pendingPlan, setPendingPlan] = useState<BulkAssignPlan | null>(null)

  // 実際の反映。空セルが尽きたらaddRow('bottom')で行を足しながら、行優先で1人ずつ新規座席を置く。
  // 元座席を持つ対象(movers)は席を置いた直後に元座席を空席化し、moveOriginsへ記録する。
  // gridの読み直しはReact状態を待てないため、addRow/placeSeatと同じ純粋関数でローカルにも
  // 同じ手順を再現し(simGrid)、次の対象のfindFirstEmptyCellの材料にする
  const commitPlan = useCallback(
    (plan: BulkAssignPlan) => {
      if (!grid) return
      let simGrid = grid
      for (const target of plan.targets) {
        let cell = findFirstEmptyCell(simGrid)
        if (!cell) {
          simGrid = addGridRow(simGrid, 'bottom')
          addRow('bottom')
          cell = findFirstEmptyCell(simGrid)
        }
        if (!cell) continue
        const newSeat = draft.addSeat({
          teamId: plan.teamId,
          x: 0,
          y: 0,
          width: DEFAULT_SEAT_WIDTH,
          height: DEFAULT_SEAT_HEIGHT,
          rotation: 0,
          employeeId: target.employee.id,
        })
        simGrid = placeSeatInGrid(simGrid, cell, newSeat.id)
        placeSeat(cell, newSeat.id)
        if (target.originSeatId) {
          draft.assignEmployee(target.originSeatId, null)
          draft.recordMoveOrigin(newSeat.id, target.originSeatId)
        }
      }
    },
    [grid, addRow, placeSeat, draft]
  )

  const requestBulkAssign = useCallback(() => {
    if (!teamId || !grid) return
    const plan = buildPlan(teamId, employees, seats, draft)
    if (plan.targets.length === 0) return
    if (plan.confirmMessage) {
      setPendingPlan(plan)
      return
    }
    commitPlan(plan)
  }, [teamId, grid, employees, seats, draft, commitPlan])

  const confirmBulkAssign = useCallback(() => {
    if (!pendingPlan) return
    commitPlan(pendingPlan)
    setPendingPlan(null)
  }, [pendingPlan, commitPlan])

  const cancelBulkAssign = useCallback(() => setPendingPlan(null), [])

  return { pendingPlan, requestBulkAssign, confirmBulkAssign, cancelBulkAssign }
}
