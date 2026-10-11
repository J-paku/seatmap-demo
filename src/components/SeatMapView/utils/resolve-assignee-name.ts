import type { Employee } from '@/types'

export const nameOf = (
  employeeById: Map<string, Employee>,
  id: string | null | undefined
): string => (id ? employeeById.get(id)?.name : undefined) ?? '担当者'
