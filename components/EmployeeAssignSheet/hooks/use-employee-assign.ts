import { useMemo, useState } from 'react'
import { matchesEmployeeQuery } from '@/utils/employee-search'
import type { Employee, Seat } from '@/types'

// 配属候補の絞り込みと、各社員が今どこに座っているかの解決

export type AssignCandidate = {
  employee: Employee
  // 既に座っている席(あれば)。選ぶと移動/入れ替えになることの予告に使う
  seatedAt: string | null
}

export const useEmployeeAssign = (employees: Employee[], seats: Seat[]) => {
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

  return { query, setQuery, candidates }
}
