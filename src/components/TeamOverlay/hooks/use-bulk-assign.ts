import { useCallback, useState } from 'react'
import type { SeatDraftState } from './use-seat-draft-state'
import type { UseOverlayEditModeResult } from './use-overlay-edit-mode'
import { buildSeatByEmployee } from '@/components/EmployeeAssignSheet/hooks/use-employee-assign'
import { addRow as addGridRow, findFirstEmptyCell, placeSeat as placeSeatInGrid } from '@/utils/layout/seat-grid-draft'
import type { SeatGridDraft } from '@/utils/layout/seat-grid-draft'
import { DEFAULT_SEAT_HEIGHT, DEFAULT_SEAT_WIDTH } from '@/utils/layout/seat-relayout'
import type { Employee, Seat } from '@/types'

// §06-4 bulk(部署一括取込): 編集モードヘッダーの「部署一括取込」から社員検索シートを開き、
// チェックボックスで選んだ社員だけを空セル(=席が1件も無いグリッド位置)へ行優先で新規座席
// として詰めていく。既に正しく着席している人まで巻き込んで席を作り直さないよう、対象は
// 「まだどこにも座っていない(newcomers)」か「他の座席に座っている(movers)」の社員だけに絞る。
// moversが1人でもいれば§07-5の移動確認を挟み、確定後は元座席を空席化してmoveOriginsへ記録する

type BulkAssignTarget = {
  employee: Employee
  // 他所の座席から移動してくる場合はその座席id。どこにも座っていなければnull(newcomer)
  originSeatId: string | null
}

// §07-5 一括移動確認の内容。文字列の組み立てはここ(純関数)に閉じ、描画側は受け取った値を
// 並べるだけにする(同じ文言をJSX側で再構成しない)。対象一覧は「名前 (部署)」で1行1件
type BulkAssignConfirm = {
  title: string
  body: string
  moverLabels: string[]
  // 未配属の新規が居る時だけ出る追記行。居なければnull
  newcomerNote: string | null
}

type BulkAssignPlan = {
  teamId: string
  targets: BulkAssignTarget[]
  moverCount: number
  // 確認ダイアログの内容。movers が1人もいなければnull(確認不要で即時実行)
  confirm: BulkAssignConfirm | null
}

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

// 選択された社員だけを対象にする。selectedEmployeeIds が null の時だけ対象席のチーム全員へ広げる
// (シートがチェックボックス選択を渡せない旧経路のフォールバック)。順序は employees の並びを保つ
const selectBulkEmployees = (
  teamId: string,
  employees: Employee[],
  selectedEmployeeIds: string[] | null
): Employee[] => {
  if (selectedEmployeeIds === null) return employees.filter((e) => e.teamId === teamId)
  const selected = new Set(selectedEmployeeIds)
  return employees.filter((e) => selected.has(e.id))
}

const buildBulkAssignPlan = (
  teamId: string,
  employees: Employee[],
  seats: Seat[],
  selectedEmployeeIds: string[] | null
): BulkAssignPlan => {
  // 「今どこに座っているか」は検索シート・下書きの配属と同じ1本(buildSeatByEmployee)で解決する。
  // seats は下書き反映済みなので employeeId をそのまま照合するだけでよい
  const seatByEmployee = buildSeatByEmployee(seats)
  const targets: BulkAssignTarget[] = []
  for (const employee of selectBulkEmployees(teamId, employees, selectedEmployeeIds)) {
    const currentSeat = seatByEmployee.get(employee.id) ?? null
    // 既にこのチームの席に座っている人は対象から外す(触らずそのまま)。外さないと、
    // 部署が既に正しく着席済みでも全員が一旦空席化→新しい席へ作り直される無駄な入れ替えが起きる
    if (currentSeat && currentSeat.teamId === teamId) continue
    targets.push({ employee, originSeatId: currentSeat ? currentSeat.id : null })
  }
  const movers = targets.filter((t) => t.originSeatId !== null)
  const newcomerCount = targets.length - movers.length
  return {
    teamId,
    targets,
    moverCount: movers.length,
    confirm:
      movers.length > 0
        ? {
            title: `${movers.length}名をこのチームへ移動しますか？`,
            body: '以下の社員は他の座席に配置済みです。複製せず、現在の座席を空けてこのチームへ移動します。',
            // 場所は出さない(§07-4と同じく生の座席IDをUIへ出さない方針)。名前と部署だけを並べる
            moverLabels: movers.map((t) => `${t.employee.name} (${t.employee.team})`),
            newcomerNote: newcomerCount > 0 ? `未配属の新規${newcomerCount}名も併せて配置します。` : null,
          }
        : null,
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
