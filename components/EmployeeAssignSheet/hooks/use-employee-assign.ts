import { useMemo, useState } from 'react'
import { matchesEmployeeQuery } from '@/utils/employee-search'
import type { Employee, Seat } from '@/types'

// 配属候補の絞り込みと、各社員が今どこに座っているかの解決

export type AssignCandidate = {
  employee: Employee
  // 既に座っている席(あれば)。選ぶと移動/入れ替えになることの予告に使う
  seatedAt: string | null
}

export const useEmployeeAssign = (employees: Employee[], seats: Seat[], targetSeat: Seat | null) => {
  const [query, setQuery] = useState('')

  const seatIdByEmployee = useMemo(() => {
    const map = new Map<string, string>()
    for (const seat of seats) {
      if (seat.employeeId) map.set(seat.employeeId, seat.id)
    }
    return map
  }, [seats])

  const candidates = useMemo<AssignCandidate[]>(
    () =>
      employees
        .filter((employee) => matchesEmployeeQuery(employee, query))
        .map((employee) => ({ employee, seatedAt: seatIdByEmployee.get(employee.id) ?? null })),
    [employees, query, seatIdByEmployee]
  )

  // STEP C3: 部署一括配置ボタンの押下可否。対象席のチームに社員が1人もいなければボタンを
  // 出しても何も起きないため、ここで判定しておく(実際の一括配置処理はuse-bulk-assignへ寄せる)
  const canBulkAssign = useMemo(
    () => targetSeat !== null && employees.some((employee) => employee.teamId === targetSeat.teamId),
    [employees, targetSeat]
  )

  return { query, setQuery, candidates, canBulkAssign }
}
