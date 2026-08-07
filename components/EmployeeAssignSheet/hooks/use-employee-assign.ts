import { useMemo, useState } from 'react'
import { matchesEmployeeQuery } from '@/utils/employee-search'
import type { Employee, Seat } from '@/types'

// 配属候補の絞り込みと、各社員が今どこに座っているかの解決

// 「今どこに座っているか」の唯一の判定口。座席配列を先頭から走査し、最初に見つかった席を
// その社員の現在席とする(utils/layout-actions.ts の seat-assign-employee が使う find と同じ先勝ち)。
// 検索シートだけでなく、部署一括配置(use-bulk-assign)と下書きの配属(use-seat-draft-state)も
// この1本を通す — 走査を各所で書くと先勝ち/後勝ちが食い違い、同じ人が2席に見える原因になる
export const buildSeatByEmployee = (seats: Seat[]): Map<string, Seat> => {
  const map = new Map<string, Seat>()
  for (const seat of seats) {
    if (seat.employeeId && !map.has(seat.employeeId)) map.set(seat.employeeId, seat)
  }
  return map
}

export type AssignCandidate = {
  employee: Employee
  // 既に座っている席(あれば)。選ぶと移動/入れ替えになることの予告に使う
  seatedAt: string | null
}

export const useEmployeeAssign = (employees: Employee[], seats: Seat[], targetSeat: Seat | null) => {
  const [query, setQuery] = useState('')

  const seatByEmployee = useMemo(() => buildSeatByEmployee(seats), [seats])

  const candidates = useMemo<AssignCandidate[]>(
    () =>
      employees
        .filter((employee) => matchesEmployeeQuery(employee, query))
        .map((employee) => ({ employee, seatedAt: seatByEmployee.get(employee.id)?.id ?? null })),
    [employees, query, seatByEmployee]
  )

  // STEP C3: 部署一括配置ボタンの押下可否。対象席のチームに社員が1人もいなければボタンを
  // 出しても何も起きないため、ここで判定しておく(実際の一括配置処理はuse-bulk-assignへ寄せる)
  const canBulkAssign = useMemo(
    () => targetSeat !== null && employees.some((employee) => employee.teamId === targetSeat.teamId),
    [employees, targetSeat]
  )

  return { query, setQuery, candidates, canBulkAssign }
}
