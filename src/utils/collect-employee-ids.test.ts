import { describe, expect, it } from 'vitest'
import { EMPLOYEES } from '@/lib/mock-loader'
import { VALID_EMPLOYEE_IDS } from '@/utils/collect-employee-ids'

describe('VALID_EMPLOYEE_IDS', () => {
  it('種データの社員idを全部含む', () => {
    for (const employee of EMPLOYEES) {
      expect(VALID_EMPLOYEE_IDS.has(employee.id)).toBe(true)
    }
  })

  it('社員id以外は含まない(件数が種データの社員数と一致する)', () => {
    expect(EMPLOYEES.length).toBeGreaterThan(0)
    expect(VALID_EMPLOYEE_IDS.size).toBe(EMPLOYEES.length)
  })

  it('種データに無いidは含まない', () => {
    expect(VALID_EMPLOYEE_IDS.has('no-such-employee')).toBe(false)
  })
})
