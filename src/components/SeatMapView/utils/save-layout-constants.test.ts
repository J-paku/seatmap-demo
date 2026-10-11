import { describe, it, expect } from 'vitest'
import { FINISH_DELAY_MS, TOAST_MS, VALID_EMPLOYEE_IDS } from './save-layout-constants'
import { EMPLOYEES } from '@/lib/mock-loader'

describe('FINISH_DELAY_MS', () => {
  it('保存中表現の疑似遅延は0.4秒', () => {
    expect(FINISH_DELAY_MS).toBe(400)
  })
})

describe('TOAST_MS', () => {
  it('保存成功トーストは仕様通り5秒出す', () => {
    expect(TOAST_MS).toBe(5000)
  })
})

describe('VALID_EMPLOYEE_IDS', () => {
  it('種データの全社員の id を持つ', () => {
    expect(EMPLOYEES.length).toBeGreaterThan(0)
    for (const employee of EMPLOYEES) expect(VALID_EMPLOYEE_IDS.has(employee.id)).toBe(true)
  })

  it('種データに居ない id は持たない', () => {
    const employeeIds = EMPLOYEES.map(employee => employee.id)
    for (const id of VALID_EMPLOYEE_IDS) expect(employeeIds).toContain(id)
    expect(VALID_EMPLOYEE_IDS.has('no-such-employee')).toBe(false)
  })
})
