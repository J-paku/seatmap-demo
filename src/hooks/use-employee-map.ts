import { useMemo } from 'react'
import type { Employee } from '@/types'

// employees配列を id→Employee の Map へ変換するフック。AttendeePopover / FacilityCurrentEvent /
export const useEmployeeMap = (employees: Employee[]): Map<string, Employee> =>
  useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees])
