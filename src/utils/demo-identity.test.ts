import { describe, it, expect } from 'vitest'
import { SELF_EMPLOYEE_ID, SELF_OWNER_CODE } from '@/utils/demo-identity'

describe('demo-identity constants', () => {
  it('exposes the self employee id used by presence/self-highlight features', () => {
    expect(SELF_EMPLOYEE_ID).toBe('emp-001')
  })

  it('exposes the self owner code (4-digit, matching the emp-NNN pad4 scheme)', () => {
    expect(SELF_OWNER_CODE).toBe('0001')
  })

  it('keeps SELF_OWNER_CODE as a 4-character numeric string', () => {
    expect(SELF_OWNER_CODE).toHaveLength(4)
    expect(SELF_OWNER_CODE).toMatch(/^\d{4}$/)
  })
})
