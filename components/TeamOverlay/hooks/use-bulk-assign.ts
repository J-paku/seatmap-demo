import { useCallback, useState } from 'react'
import type { SeatDraftState } from './use-seat-draft-state'
import type { UseOverlayEditModeResult } from './use-overlay-edit-mode'
import { buildSeatByEmployee } from '@/components/EmployeeAssignSheet/hooks/use-employee-assign'
import { addRow as addGridRow, findFirstEmptyCell, placeSeat as placeSeatInGrid } from '@/utils/layout/seat-grid-draft'
import type { SeatGridDraft } from '@/utils/layout/seat-grid-draft'
import { DEFAULT_SEAT_HEIGHT, DEFAULT_SEAT_WIDTH } from '@/utils/layout/seat-relayout'
import type { Employee, Seat } from '@/types'

// STEP C3: 部署ごとの一括配置。EmployeeAssignSheetの「この部署をまとめて配属」から呼ばれ、
// 対象席のチームに属する社員全員を、空セル(=席が1件も無いグリッド位置)へ行優先で新規座席
// として詰めていく。既に正しく着席している人まで巻き込んで席を作り直さないよう、対象は
// 「まだどこにも座っていない(newcomers)」か「他の座席に座っている(movers)」の社員だけに絞る。
// moversが1人でもいれば確認を挟み、確定後は元座席を空席化してmoveOriginsへ記録する

type BulkAssignTarget = {
  employee: Employee
  // 他所の座席から移動してくる場合はその座席id。どこにも座っていなければnull(newcomer)
  originSeatId: string | null
}

type BulkAssignPlan = {
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
  // STEP C4: 全社員の現在の着席先を解決するための全座席。呼び出し元(TeamOverlay/index.tsx)で
  // 下書き反映済み(useDraftAppliedSeats)にしてから渡ってくるため、ここでは削除・割当上書きを
  // 二重に解決しない(同じ概念の判定基準を2つ作らないため)
  seats: Seat[]
  grid: SeatGridDraft | null
  draft: SeatDraftState
  addRow: UseOverlayEditModeResult['addRow']
  placeSeat: UseOverlayEditModeResult['placeSeat']
  // STEP D3: 一括配置の結果をLiveRegionへ流す唯一の口。呼び出し元(TeamOverlay/index.tsx)が
  // useGlobalAnnouncementから渡す(このフック自身はa11yの配線を持たない)
  announce: (message: string) => void
}

const buildPlan = (teamId: string, employees: Employee[], seats: Seat[]): BulkAssignPlan => {
  // 「今どこに座っているか」は検索シート・下書きの配属と同じ1本(buildSeatByEmployee)で解決する。
  // seats は下書き反映済みなので employeeId をそのまま照合するだけでよい
  const seatByEmployee = buildSeatByEmployee(seats)
  const targets: BulkAssignTarget[] = []
  for (const employee of employees.filter((e) => e.teamId === teamId)) {
    const currentSeat = seatByEmployee.get(employee.id) ?? null
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

export const useBulkAssign = ({
  teamId,
  employees,
  seats,
  grid,
  draft,
  addRow,
  placeSeat,
  announce,
}: Options): UseBulkAssignResult => {
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
      announce(`[success]${plan.targets.length}名を配置しました`)
    },
    [grid, addRow, placeSeat, draft, announce]
  )

  const requestBulkAssign = useCallback(() => {
    if (!teamId || !grid) return
    const plan = buildPlan(teamId, employees, seats)
    if (plan.targets.length === 0) return
    if (plan.confirmMessage) {
      setPendingPlan(plan)
      return
    }
    commitPlan(plan)
  }, [teamId, grid, employees, seats, commitPlan])

  const confirmBulkAssign = useCallback(() => {
    if (!pendingPlan) return
    commitPlan(pendingPlan)
    setPendingPlan(null)
  }, [pendingPlan, commitPlan])

  const cancelBulkAssign = useCallback(() => setPendingPlan(null), [])

  return { pendingPlan, requestBulkAssign, confirmBulkAssign, cancelBulkAssign }
}
