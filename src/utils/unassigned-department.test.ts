import { describe, it, expect } from 'vitest'
import { UNASSIGNED_DEPARTMENT } from './unassigned-department'

describe('UNASSIGNED_DEPARTMENT', () => {
  it('所属部署が空の社員は「未所属」にまとめる', () => {
    expect(UNASSIGNED_DEPARTMENT).toBe('未所属')
  })
})
