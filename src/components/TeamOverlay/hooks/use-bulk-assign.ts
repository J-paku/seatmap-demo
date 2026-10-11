import { useCallback, useState } from 'react'
import type { SeatDraftState } from './use-seat-draft-state'
import type { UseOverlayEditModeResult } from './use-overlay-edit-mode'
import {
  addRow as addGridRow,
  findFirstEmptyCell,
  placeSeat as placeSeatInGrid,
} from '@/utils/layout/seat-grid-draft'
import type { SeatGridDraft } from '@/utils/layout/seat-grid-draft'
import { DEFAULT_SEAT_HEIGHT, DEFAULT_SEAT_WIDTH } from '@/utils/layout/seat-relayout'
import type { Employee, Seat } from '@/types'
import { buildBulkAssignPlan } from '../utils/plan-bulk-assign'
import type { BulkAssignPlan } from '../utils/plan-bulk-assign'

// §06-4 bulk(部署一括取込): 編集モードヘッダーの「部署一括取込」から社員検索シートを開き、
// チェックボックスで選んだ社員だけを空セル(=席が1件も無いグリッド位置)へ行優先で新規座席
// として詰めていく。既に正しく着席している人まで巻き込んで席を作り直さないよう、対象は
// 「まだどこにも座っていない(newcomers)」か「他の座席に座っている(movers)」の社員だけに絞る。
// moversが1人でもいれば§07-5の移動確認を挟み、確定後は元座席を空席化してmoveOriginsへ記録する

export type UseBulkAssignResult = {
  pendingPlan: BulkAssignPlan | null
  // 一括配置の唯一の入口。employeeIds が null なら対象席のチーム全員(旧来の部署まるごと取込)、
  // 配列ならその社員だけを対象にする。対象0件、未編集(grid未確立)なら何もしない
  requestBulkAssign: (employeeIds: string[] | null) => void
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

  const requestBulkAssign = useCallback(
    (employeeIds: string[] | null) => {
      if (!teamId || !grid) return
      const plan = buildBulkAssignPlan(teamId, employees, seats, employeeIds)
      if (plan.targets.length === 0) return
      if (plan.confirm) {
        setPendingPlan(plan)
        return
      }
      commitPlan(plan)
    },
    [teamId, grid, employees, seats, commitPlan]
  )

  const confirmBulkAssign = useCallback(() => {
    if (!pendingPlan) return
    commitPlan(pendingPlan)
    setPendingPlan(null)
  }, [pendingPlan, commitPlan])

  const cancelBulkAssign = useCallback(() => setPendingPlan(null), [])

  return { pendingPlan, requestBulkAssign, confirmBulkAssign, cancelBulkAssign }
}
