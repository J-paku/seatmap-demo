// useBulkAssign(部署一括取込)が使う、対象社員の選び出しと一括配置の計画の組み立て
import { buildSeatByEmployee } from '@/components/EmployeeAssignSheet/hooks/use-employee-assign'
import type { Employee, Seat } from '@/types'

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

export type BulkAssignPlan = {
  teamId: string
  targets: BulkAssignTarget[]
  moverCount: number
  // 確認ダイアログの内容。movers が1人もいなければnull(確認不要で即時実行)
  confirm: BulkAssignConfirm | null
}

// 選択された社員だけを対象にする。selectedEmployeeIds が null の時だけ対象席のチーム全員へ広げる
// (シートがチェックボックス選択を渡せない旧経路のフォールバック)。順序は employees の並びを保つ
const selectBulkEmployees = (
  teamId: string,
  employees: Employee[],
  selectedEmployeeIds: string[] | null
): Employee[] => {
  if (selectedEmployeeIds === null) return employees.filter(e => e.teamId === teamId)
  const selected = new Set(selectedEmployeeIds)
  return employees.filter(e => selected.has(e.id))
}

export const buildBulkAssignPlan = (
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
  const movers = targets.filter(t => t.originSeatId !== null)
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
            moverLabels: movers.map(t => `${t.employee.name} (${t.employee.team})`),
            newcomerNote:
              newcomerCount > 0 ? `未配属の新規${newcomerCount}名も併せて配置します。` : null,
          }
        : null,
  }
}
